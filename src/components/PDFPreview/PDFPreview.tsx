import { PDF_PREVIEW_CHAR_LIMIT } from "@/types/pdf";

type PDFPreviewProps = {
  fileName: string;
  totalPages: number;
  text: string;
};

export function PDFPreview({ fileName, totalPages, text }: PDFPreviewProps) {
  const previewText = text.slice(0, PDF_PREVIEW_CHAR_LIMIT);
  const isTruncated = text.length > PDF_PREVIEW_CHAR_LIMIT;
  const previewCharCount = previewText.length;

  return (
    <section
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="pdf-preview-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <div>
          <h2
            id="pdf-preview-heading"
            className="text-lg font-semibold text-slate-900"
          >
            PDF Preview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Extracted text from{" "}
            <span className="font-medium text-slate-700">{fileName}</span>
            {" · "}
            {totalPages.toLocaleString()}{" "}
            {totalPages === 1 ? "page" : "pages"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Characters shown
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">
            {previewCharCount.toLocaleString()}
            {isTruncated && (
              <span className="font-normal text-slate-400">
                {" "}
                / {text.length.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-700">Text preview</h3>
          {isTruncated && (
            <span className="text-xs text-slate-400">
              Showing first {PDF_PREVIEW_CHAR_LIMIT.toLocaleString()} characters
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed text-slate-700">
            {previewText}
            {isTruncated && "…"}
          </pre>
        </div>
      </div>
    </section>
  );
}
