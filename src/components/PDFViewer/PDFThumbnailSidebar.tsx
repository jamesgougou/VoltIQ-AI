"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type PDFThumbnailSidebarProps = {
  pdf: PDFDocumentProxy;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
};

const THUMB_WIDTH = 120;
const VISIBLE_BUFFER = 8;

export function PDFThumbnailSidebar({
  pdf,
  totalPages,
  currentPage,
  onSelectPage,
}: PDFThumbnailSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({
    start: 1,
    end: Math.min(totalPages, 20),
  });

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    function updateVisible() {
      if (!container) return;

      const itemHeight = 170;
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const start = Math.max(
        1,
        Math.floor(scrollTop / itemHeight) - VISIBLE_BUFFER,
      );
      const end = Math.min(
        totalPages,
        Math.ceil((scrollTop + height) / itemHeight) + VISIBLE_BUFFER,
      );
      setVisibleRange({ start, end });
    }

    updateVisible();
    container.addEventListener("scroll", updateVisible, { passive: true });
    return () => container.removeEventListener("scroll", updateVisible);
  }, [totalPages]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    const itemHeight = 170;
    const targetTop = (currentPage - 1) * itemHeight;
    const visibleTop = container.scrollTop;
    const visibleBottom = visibleTop + container.clientHeight;

    if (targetTop < visibleTop || targetTop + itemHeight > visibleBottom) {
      container.scrollTo({ top: Math.max(targetTop - 40, 0), behavior: "smooth" });
    }
  }, [currentPage]);

  return (
    <aside className="flex h-full w-40 shrink-0 flex-col border-r border-slate-200 bg-slate-50 sm:w-44">
      <div className="border-b border-slate-200 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pages
        </p>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div style={{ height: totalPages * 170 }} className="relative">
          {Array.from(
            { length: visibleRange.end - visibleRange.start + 1 },
            (_, index) => visibleRange.start + index,
          ).map((pageNumber) => (
            <div
              key={pageNumber}
              className="absolute left-0 right-0 px-1"
              style={{ top: (pageNumber - 1) * 170 }}
            >
              <ThumbnailButton
                pdf={pdf}
                pageNumber={pageNumber}
                active={pageNumber === currentPage}
                onClick={() => onSelectPage(pageNumber)}
              />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ThumbnailButton({
  pdf,
  pageNumber,
  active,
  onClick,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderThumb() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const unscaled = page.getViewport({ scale: 1 });
        const scale = THUMB_WIDTH / unscaled.width;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    void renderThumb();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 w-full rounded-lg border p-1.5 text-left transition-colors ${
        active
          ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      aria-current={active ? "page" : undefined}
      aria-label={`Go to page ${pageNumber}`}
    >
      <div className="flex min-h-28 items-center justify-center overflow-hidden rounded bg-slate-100">
        {error ? (
          <span className="text-[10px] text-slate-400">Unavailable</span>
        ) : (
          <canvas ref={canvasRef} className="max-w-full" />
        )}
      </div>
      <span className="mt-1 block text-center text-[11px] font-medium text-slate-600">
        {pageNumber}
      </span>
    </button>
  );
}
