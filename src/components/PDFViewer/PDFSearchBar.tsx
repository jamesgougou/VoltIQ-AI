"use client";

type PDFSearchBarProps = {
  query: string;
  matchCount: number;
  activeMatch: number;
  isSearching?: boolean;
  onQueryChange: (query: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClear: () => void;
};

export function PDFSearchBar({
  query,
  matchCount,
  activeMatch,
  isSearching = false,
  onQueryChange,
  onNext,
  onPrevious,
  onClear,
}: PDFSearchBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="sr-only">Search inside PDF</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search inside PDF…"
          className="w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </label>

      <span className="text-xs text-slate-500">
        {isSearching
          ? "Searching…"
          : query.trim()
            ? matchCount === 0
              ? "No matches"
              : `${activeMatch} / ${matchCount}`
            : "Match count"}
      </span>

      <button
        type="button"
        onClick={onPrevious}
        disabled={!query.trim() || matchCount === 0}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!query.trim() || matchCount === 0}
        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        Next
      </button>
      {query.trim() && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      )}
    </div>
  );
}
