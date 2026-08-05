"use client";

import { MAX_SCALE, MIN_SCALE, type ZoomMode } from "./types";

type PDFViewerToolbarProps = {
  fileName: string;
  page: number;
  totalPages: number;
  scale: number;
  zoomMode: ZoomMode;
  sidebarOpen: boolean;
  disabled?: boolean;
  onToggleSidebar: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onJumpToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onRotate: () => void;
  onClose: () => void;
};

export function PDFViewerToolbar({
  fileName,
  page,
  totalPages,
  scale,
  zoomMode,
  sidebarOpen,
  disabled = false,
  onToggleSidebar,
  onPrevPage,
  onNextPage,
  onJumpToPage,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onRotate,
  onClose,
}: PDFViewerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <button
        type="button"
        onClick={onToggleSidebar}
        disabled={disabled}
        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        aria-pressed={sidebarOpen}
      >
        {sidebarOpen ? "Hide pages" : "Pages"}
      </button>

      <div className="min-w-0 flex-1 basis-40">
        <p
          className="truncate text-sm font-semibold text-slate-900"
          title={fileName}
        >
          {fileName}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <ToolbarButton
          label="Previous page"
          onClick={onPrevPage}
          disabled={disabled || page <= 1}
        >
          Prev
        </ToolbarButton>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          <input
            type="number"
            min={1}
            max={Math.max(totalPages, 1)}
            value={page}
            disabled={disabled || totalPages < 1}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                onJumpToPage(next);
              }
            }}
            className="w-14 rounded-md border border-slate-200 px-1.5 py-1 text-center text-xs"
            aria-label="Jump to page"
          />
          <span>/ {totalPages || "—"}</span>
        </label>
        <ToolbarButton
          label="Next page"
          onClick={onNextPage}
          disabled={disabled || page >= totalPages}
        >
          Next
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          label="Zoom out"
          onClick={onZoomOut}
          disabled={disabled || scale <= MIN_SCALE}
        >
          −
        </ToolbarButton>
        <span className="min-w-16 text-center text-xs text-slate-600">
          {zoomMode === "fit-width"
            ? "Fit width"
            : zoomMode === "fit-page"
              ? "Fit page"
              : `${Math.round(scale * 100)}%`}
        </span>
        <ToolbarButton
          label="Zoom in"
          onClick={onZoomIn}
          disabled={disabled || scale >= MAX_SCALE}
        >
          +
        </ToolbarButton>
        <ToolbarButton label="Fit width" onClick={onFitWidth} disabled={disabled}>
          Fit W
        </ToolbarButton>
        <ToolbarButton label="Fit page" onClick={onFitPage} disabled={disabled}>
          Fit P
        </ToolbarButton>
        <ToolbarButton label="Rotate" onClick={onRotate} disabled={disabled}>
          Rotate
        </ToolbarButton>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        Close
      </button>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
