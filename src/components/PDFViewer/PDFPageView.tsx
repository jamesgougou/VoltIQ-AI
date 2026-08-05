"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  excerptSearchQuery,
  extractTextItems,
  findMatchesOnPage,
  type HighlightRect,
} from "@/lib/pdf/textMatch";
import { ensurePdfWorker } from "@/lib/pdf/pdfWorker";

type PDFPageViewProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  /** Retrieved chunk excerpt to highlight (yellow). */
  chunkExcerpt?: string;
  /** In-document search query (orange). */
  searchQuery?: string;
  /** Which search match on this page is active. */
  activeSearchLocalIndex?: number;
  onRendered?: (pageNumber: number, width: number, height: number) => void;
  onChunkHighlightReady?: (rects: HighlightRect[]) => void;
  onError?: (message: string) => void;
};

export function PDFPageView({
  pdf,
  pageNumber,
  scale,
  rotation,
  chunkExcerpt,
  searchQuery,
  activeSearchLocalIndex = -1,
  onRendered,
  onChunkHighlightReady,
  onError,
}: PDFPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [chunkRects, setChunkRects] = useState<HighlightRect[]>([]);
  const [searchRects, setSearchRects] = useState<HighlightRect[][]>([]);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      let page: PDFPageProxy | null = null;

      try {
        page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;

        if (!canvas || !textLayerDiv) {
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Unable to create canvas context.");
        }

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTaskRef.current?.cancel();
        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (cancelled) return;

        textLayerDiv.replaceChildren();
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;

        const pdfjs = await ensurePdfWorker();
        const textContent = await page.getTextContent();
        const textLayer = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();

        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1, rotation });
        const items = extractTextItems(textContent.items);

        const chunkQuery = chunkExcerpt
          ? excerptSearchQuery(chunkExcerpt)
          : "";
        let nextChunkRects: HighlightRect[] = [];

        if (chunkQuery) {
          const matches = findMatchesOnPage(
            items,
            chunkQuery,
            pageNumber,
            viewport.width,
            viewport.height,
            baseViewport.width,
            baseViewport.height,
          );
          nextChunkRects = matches.flatMap((match) => match.rects);
        }

        let nextSearchRects: HighlightRect[][] = [];
        if (searchQuery?.trim()) {
          const matches = findMatchesOnPage(
            items,
            searchQuery,
            pageNumber,
            viewport.width,
            viewport.height,
            baseViewport.width,
            baseViewport.height,
          );
          nextSearchRects = matches.map((match) => match.rects);
        }

        setChunkRects(nextChunkRects);
        setSearchRects(nextSearchRects);
        setSize({ width: viewport.width, height: viewport.height });
        onRendered?.(pageNumber, viewport.width, viewport.height);
        onChunkHighlightReady?.(nextChunkRects);
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error
            ? error.message
            : "Failed to render this PDF page.";

        if (!message.toLowerCase().includes("cancelled")) {
          onError?.(message);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [
    pdf,
    pageNumber,
    scale,
    rotation,
    chunkExcerpt,
    searchQuery,
    onRendered,
    onChunkHighlightReady,
    onError,
  ]);

  return (
    <div
      className="pdf-page relative mx-auto bg-white shadow-md"
      style={{
        width: size.width || undefined,
        height: size.height || undefined,
      }}
      data-page={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />
      <div ref={textLayerRef} className="pdf-text-layer" />
      <div className="pdf-highlight-layer">
        {chunkRects.map((rect, index) => (
          <div
            key={`chunk-${index}`}
            className="pdf-chunk-highlight"
            data-chunk-highlight="true"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          />
        ))}
        {searchRects.map((rects, matchIndex) =>
          rects.map((rect, rectIndex) => (
            <div
              key={`search-${matchIndex}-${rectIndex}`}
              className={`pdf-search-highlight ${
                matchIndex === activeSearchLocalIndex ? "is-active" : ""
              }`}
              style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}
