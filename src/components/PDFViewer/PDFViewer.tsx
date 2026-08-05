"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { getCachedPdfDocument } from "@/lib/pdf/pdfDocumentCache";
import {
  searchPdfDocument,
  type PdfSearchHit,
} from "@/lib/pdf/pdfSearch";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePDFViewer } from "./PDFViewerContext";
import { PDFPageView } from "./PDFPageView";
import { PDFSearchBar } from "./PDFSearchBar";
import { PDFThumbnailSidebar } from "./PDFThumbnailSidebar";
import { PDFViewerToolbar } from "./PDFViewerToolbar";
import {
  MAX_SCALE,
  MIN_SCALE,
  SCALE_STEP,
  type ViewerErrorKind,
} from "./types";

function errorMessage(kind: ViewerErrorKind, fileName?: string): string {
  switch (kind) {
    case "missing":
      return fileName
        ? `“${fileName}” is not available in this session. Re-upload the PDF to open the source.`
        : "This PDF is not available in this session. Re-upload the document to open the source.";
    case "corrupt":
      return "This PDF could not be opened. The file may be corrupted or password-protected.";
    case "render":
      return "This page could not be rendered. Try another page or re-upload the document.";
    case "invalid-page":
      return "The referenced page is outside the document range. Showing the nearest valid page.";
    default:
      return "Something went wrong while opening the PDF viewer.";
  }
}

export function PDFViewer() {
  const {
    isOpen,
    activeSource,
    request,
    getDocumentState,
    updateDocumentState,
    closeViewer,
  } = usePDFViewer();

  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [fatalError, setFatalError] = useState<ViewerErrorKind | null>(null);
  const [warning, setWarning] = useState<ViewerErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [resolvedScale, setResolvedScale] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<PdfSearchHit[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [chunkExcerpt, setChunkExcerpt] = useState("");
  const highlightScrollKeyRef = useRef<string | null>(null);

  const documentId = activeSource?.documentId ?? request?.documentId ?? null;
  const viewerState = documentId
    ? getDocumentState(documentId)
    : getDocumentState("__none__");

  const totalPages = pdf?.numPages ?? activeSource?.totalPages ?? 0;
  const trimmedSearchQuery = searchQuery.trim();
  const effectiveSearchHits = trimmedSearchQuery ? searchHits : [];
  const activeHit = effectiveSearchHits[activeSearchIndex];
  const activeSearchLocalIndex =
    activeHit && activeHit.pageNumber === viewerState.page
      ? activeHit.localIndex
      : -1;

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeViewer();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeViewer]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadDocument() {
      if (!activeSource?.blobUrl || !documentId) {
        setPdf(null);
        setFatalError("missing");
        setWarning(null);
        setErrorDetail(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setFatalError(null);
      setWarning(null);
      setErrorDetail(null);

      try {
        const document = await getCachedPdfDocument(
          documentId,
          activeSource.blobUrl,
        );

        if (cancelled) return;

        setPdf(document);

        const requestedPage = request?.page ?? viewerState.page;
        let safePage = requestedPage || 1;

        if (safePage < 1 || safePage > document.numPages) {
          setWarning("invalid-page");
          safePage = Math.min(Math.max(safePage, 1), document.numPages);
        }

        updateDocumentState(documentId, { page: safePage });
        setChunkExcerpt(request?.excerpt?.trim() || "");
        highlightScrollKeyRef.current = `${documentId}:${safePage}:${request?.chunkId ?? ""}`;
        setSearchQuery("");
        setSearchHits([]);
        setActiveSearchIndex(0);
      } catch (error) {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : "Unable to open PDF.";
        setPdf(null);
        setFatalError("corrupt");
        setErrorDetail(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    activeSource?.blobUrl,
    activeSource?.documentId,
    documentId,
    request?.page,
    request?.excerpt,
    request?.chunkId,
    updateDocumentState,
  ]);

  const computeFitScale = useCallback(
    async (mode: "fit-width" | "fit-page") => {
      if (!pdf || !stageRef.current) {
        return 1;
      }

      const page = await pdf.getPage(viewerState.page);
      const viewport = page.getViewport({
        scale: 1,
        rotation: viewerState.rotation,
      });
      const stage = stageRef.current;
      const availableWidth = Math.max(stage.clientWidth - 32, 120);
      const availableHeight = Math.max(stage.clientHeight - 32, 120);

      if (mode === "fit-width") {
        return availableWidth / viewport.width;
      }

      return Math.min(
        availableWidth / viewport.width,
        availableHeight / viewport.height,
      );
    },
    [pdf, viewerState.page, viewerState.rotation],
  );

  useEffect(() => {
    if (!isOpen || !pdf || !documentId) return;

    let cancelled = false;

    async function resolveScale() {
      if (viewerState.zoomMode === "custom") {
        if (!cancelled) setResolvedScale(viewerState.customScale);
        return;
      }

      const next = await computeFitScale(viewerState.zoomMode);
      if (!cancelled) setResolvedScale(next);
    }

    void resolveScale();

    const observer = new ResizeObserver(() => {
      void resolveScale();
    });

    if (stageRef.current) {
      observer.observe(stageRef.current);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [
    isOpen,
    pdf,
    documentId,
    viewerState.zoomMode,
    viewerState.customScale,
    viewerState.page,
    viewerState.rotation,
    computeFitScale,
  ]);

  useEffect(() => {
    if (!isOpen || !pdf || !trimmedSearchQuery) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);

      void searchPdfDocument(
        pdf,
        trimmedSearchQuery,
        (partial) => {
          if (!controller.signal.aborted) {
            setSearchHits(partial);
          }
        },
        controller.signal,
      )
        .then((hits) => {
          if (controller.signal.aborted || !documentId) return;
          setSearchHits(hits);
          setActiveSearchIndex(0);
          if (hits[0]) {
            updateDocumentState(documentId, { page: hits[0].pageNumber });
          }
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, pdf, trimmedSearchQuery, documentId, updateDocumentState]);

  const setPage = useCallback(
    (page: number) => {
      if (!documentId || totalPages < 1) return;
      const safe = Math.min(Math.max(Math.round(page), 1), totalPages);
      updateDocumentState(documentId, { page: safe });
    },
    [documentId, totalPages, updateDocumentState],
  );

  const handleChunkHighlightReady = useCallback(() => {
    if (!highlightScrollKeyRef.current || !scrollRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      const highlight = scrollRef.current?.querySelector(
        "[data-chunk-highlight='true']",
      );

      if (highlight instanceof HTMLElement) {
        highlight.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightScrollKeyRef.current = null;
      }
    });
  }, []);

  if (!isOpen) {
    return null;
  }

  const fileName = activeSource?.fileName ?? request?.fileName ?? "Document";

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-viewer-title"
    >
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <h2 id="pdf-viewer-title" className="sr-only">
          PDF Viewer — {fileName}
        </h2>

        <PDFViewerToolbar
          fileName={fileName}
          page={viewerState.page}
          totalPages={totalPages}
          scale={resolvedScale}
          zoomMode={viewerState.zoomMode}
          sidebarOpen={viewerState.sidebarOpen}
          disabled={!pdf || loading || Boolean(fatalError)}
          onToggleSidebar={() => {
            if (!documentId) return;
            updateDocumentState(documentId, {
              sidebarOpen: !viewerState.sidebarOpen,
            });
          }}
          onPrevPage={() => setPage(viewerState.page - 1)}
          onNextPage={() => setPage(viewerState.page + 1)}
          onJumpToPage={setPage}
          onZoomIn={() => {
            if (!documentId) return;
            updateDocumentState(documentId, {
              zoomMode: "custom",
              customScale: Math.min(
                MAX_SCALE,
                (viewerState.zoomMode === "custom"
                  ? viewerState.customScale
                  : resolvedScale) + SCALE_STEP,
              ),
            });
          }}
          onZoomOut={() => {
            if (!documentId) return;
            updateDocumentState(documentId, {
              zoomMode: "custom",
              customScale: Math.max(
                MIN_SCALE,
                (viewerState.zoomMode === "custom"
                  ? viewerState.customScale
                  : resolvedScale) - SCALE_STEP,
              ),
            });
          }}
          onFitWidth={() => {
            if (!documentId) return;
            updateDocumentState(documentId, { zoomMode: "fit-width" });
          }}
          onFitPage={() => {
            if (!documentId) return;
            updateDocumentState(documentId, { zoomMode: "fit-page" });
          }}
          onRotate={() => {
            if (!documentId) return;
            updateDocumentState(documentId, {
              rotation: (viewerState.rotation + 90) % 360,
            });
          }}
          onClose={closeViewer}
        />

        <PDFSearchBar
          query={searchQuery}
          matchCount={effectiveSearchHits.length}
          activeMatch={
            effectiveSearchHits.length === 0 ? 0 : activeSearchIndex + 1
          }
          isSearching={isSearching}
          onQueryChange={setSearchQuery}
          onClear={() => {
            setSearchQuery("");
            setSearchHits([]);
            setActiveSearchIndex(0);
            setIsSearching(false);
          }}
          onNext={() => {
            if (effectiveSearchHits.length === 0 || !documentId) return;
            const next =
              (activeSearchIndex + 1) % effectiveSearchHits.length;
            setActiveSearchIndex(next);
            updateDocumentState(documentId, {
              page: effectiveSearchHits[next]!.pageNumber,
            });
          }}
          onPrevious={() => {
            if (effectiveSearchHits.length === 0 || !documentId) return;
            const next =
              (activeSearchIndex - 1 + effectiveSearchHits.length) %
              effectiveSearchHits.length;
            setActiveSearchIndex(next);
            updateDocumentState(documentId, {
              page: effectiveSearchHits[next]!.pageNumber,
            });
          }}
        />

        {warning && !fatalError && (
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {errorMessage(warning, fileName)}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          {pdf && viewerState.sidebarOpen && !fatalError && (
            <div className="hidden md:flex">
              <PDFThumbnailSidebar
                pdf={pdf}
                totalPages={totalPages}
                currentPage={viewerState.page}
                onSelectPage={setPage}
              />
            </div>
          )}

          <div
            ref={stageRef}
            className="relative min-h-0 min-w-0 flex-1 bg-slate-100"
          >
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <LoadingSpinner label="Opening PDF…" />
              </div>
            )}

            {fatalError && !loading && (
              <div className="flex h-full items-center justify-center p-6">
                <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold">Unable to open source</p>
                  <p className="mt-1 text-amber-800">
                    {errorMessage(fatalError, fileName)}
                  </p>
                  {errorDetail && (
                    <p className="mt-2 text-xs text-amber-700/80">
                      {errorDetail}
                    </p>
                  )}
                </div>
              </div>
            )}

            {pdf && !fatalError && (
              <div
                ref={scrollRef}
                className="h-full overflow-auto p-4"
                onScroll={(event) => {
                  if (!documentId) return;
                  updateDocumentState(documentId, {
                    scrollTop: event.currentTarget.scrollTop,
                  });
                }}
              >
                <PDFPageView
                  pdf={pdf}
                  pageNumber={viewerState.page}
                  scale={resolvedScale}
                  rotation={viewerState.rotation}
                  chunkExcerpt={chunkExcerpt}
                  searchQuery={trimmedSearchQuery}
                  activeSearchLocalIndex={activeSearchLocalIndex}
                  onRendered={() => {
                    if (scrollRef.current && viewerState.scrollTop > 0) {
                      scrollRef.current.scrollTop = viewerState.scrollTop;
                    }
                  }}
                  onChunkHighlightReady={handleChunkHighlightReady}
                  onError={() => setWarning("render")}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
