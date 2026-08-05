"use client";

import type { RetrievalScope, RetrievalScopeMode } from "@/lib/rag/libraryMeta";

export type ScopeDocumentOption = {
  id: string;
  name: string;
  enabled?: boolean;
};

type RetrievalScopeBarProps = {
  scope: RetrievalScope;
  documents: ScopeDocumentOption[];
  searchingLabel: string;
  onChange: (scope: RetrievalScope) => void;
  disabled?: boolean;
};

const MODE_OPTIONS: Array<{ value: RetrievalScopeMode; label: string }> = [
  { value: "all-enabled", label: "All Enabled Documents" },
  { value: "current", label: "Current Document Only" },
  { value: "selected", label: "Selected Documents" },
];

export function RetrievalScopeBar({
  scope,
  documents,
  searchingLabel,
  onChange,
  disabled = false,
}: RetrievalScopeBarProps) {
  const enabledDocs = documents.filter((document) => document.enabled !== false);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Search scope
        </label>
        <select
          value={scope.mode}
          disabled={disabled || enabledDocs.length === 0}
          onChange={(event) => {
            const mode = event.target.value as RetrievalScopeMode;
            onChange({
              ...scope,
              mode,
              currentDocumentId:
                scope.currentDocumentId ?? enabledDocs[0]?.id ?? null,
              selectedDocumentIds:
                scope.selectedDocumentIds?.length
                  ? scope.selectedDocumentIds
                  : enabledDocs.map((document) => document.id),
            });
          }}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
        >
          {MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {scope.mode === "current" && (
          <select
            value={scope.currentDocumentId ?? ""}
            disabled={disabled || enabledDocs.length === 0}
            onChange={(event) =>
              onChange({
                ...scope,
                currentDocumentId: event.target.value || null,
              })
            }
            className="min-w-0 max-w-[14rem] truncate rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
          >
            {enabledDocs.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {scope.mode === "selected" && enabledDocs.length > 0 && (
        <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
          {enabledDocs.map((document) => {
            const checked = (scope.selectedDocumentIds ?? []).includes(
              document.id,
            );

            return (
              <label
                key={document.id}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                  checked
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    const current = new Set(scope.selectedDocumentIds ?? []);
                    if (current.has(document.id)) {
                      current.delete(document.id);
                    } else {
                      current.add(document.id);
                    }
                    onChange({
                      ...scope,
                      selectedDocumentIds: [...current],
                    });
                  }}
                  className="h-3 w-3 rounded border-slate-300 text-violet-600"
                />
                <span className="max-w-[10rem] truncate">{document.name}</span>
              </label>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Searching:</span>{" "}
        {searchingLabel}
      </p>
    </div>
  );
}
