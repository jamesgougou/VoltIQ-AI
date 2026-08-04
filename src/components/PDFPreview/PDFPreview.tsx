import { PDF_PREVIEW_CHAR_LIMIT } from "@/types/pdf";

type PDFPreviewProps = {
  fileName: string;
  totalPages: number;
  text: string;
};

export function PDFPreview({ fileName, totalPages, text }: PDFPreviewProps) {
  const previewText = text.slice(0, PDF_PREVIEW_CHAR_LIMIT);
  const isTruncated = text.length > PDF_PREVIEW_CHAR_LIMIT;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="pdf-preview-heading"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2
            id="pdf-preview-heading"
            className="text-lg font-semibold text-slate-900"
          >
            PDF Preview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Extracted text from your uploaded document
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              File
            </p>
            <p className="mt-0.5 max-w-xs truncate text-sm font-medium text-slate-800">
              {fileName}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pages
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">
              {totalPages}
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Text preview</h3>
          {isTruncated && (
            <span className="text-xs text-slate-400">
              Showing first {PDF_PREVIEW_CHAR_LIMIT.toLocaleString()} of{" "}
              {text.length.toLocaleString()} characters
            </span>
          )}
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-700">
          {previewText}
          {isTruncated && "…"}
        </pre>
      </div>
    </section>
  );
}
