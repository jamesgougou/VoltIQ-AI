import { formatFileSize } from "@/lib/format";

type DocumentSummaryProps = {
  fileName: string;
  fileSize: number;
  totalPages: number;
  totalCharacters: number;
};

export function DocumentSummary({
  fileName,
  fileSize,
  totalPages,
  totalCharacters,
}: DocumentSummaryProps) {
  const stats = [
    { label: "File name", value: fileName },
    { label: "File size", value: formatFileSize(fileSize) },
    { label: "Total pages", value: totalPages.toLocaleString() },
    {
      label: "Extracted characters",
      value: totalCharacters.toLocaleString(),
    },
  ];

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="document-summary-heading"
    >
      <div className="mb-4">
        <h2
          id="document-summary-heading"
          className="text-lg font-semibold text-slate-900"
        >
          Document Summary
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Overview of your uploaded PDF
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {stat.label}
            </dt>
            <dd
              className="mt-1 truncate text-sm font-semibold text-slate-800"
              title={stat.value}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
