"use client";

import { useMemo, useRef, useState } from "react";
import { formatFileSize } from "@/lib/format";
import {
  LIBRARY_TAG_OPTIONS,
  loadLibrarySortPreference,
  matchesLibraryQuery,
  saveLibrarySortPreference,
  sortLibraryDocuments,
  type LibrarySortKey,
} from "@/lib/rag/libraryMeta";
import { MAX_PDF_SIZE_LABEL } from "@/lib/upload/limits";
import type { PdfDocument, PdfParseResult } from "@/types/pdf";
import type { DocumentIndexState } from "@/types/rag";
import { DocumentIndexProgressCard } from "./DocumentIndexProgressCard";
import { AddButton, DeleteButton } from "./ManagerActions";
import { ManagerSection } from "./ManagerSection";
import { PdfIcon } from "./UploadIcons";

type PdfUploadManagerProps = {
  pdfs: PdfDocument[];
  indexStates?: Record<string, DocumentIndexState>;
  onAdd: (result: PdfParseResult, file: File) => void | Promise<void>;
  onRemove: (id: string) => void;
  onOpen?: (id: string) => void;
  onRetry?: (documentId: string) => void;
  onCancel?: (documentId: string) => void;
  onParseCancelled?: () => void;
  onError?: () => void;
  onToggleEnabled?: (documentId: string, enabled: boolean) => void;
  onTagsChange?: (documentId: string, tags: string[]) => void;
  onBulkEnable?: (documentIds: string[], enabled: boolean) => void;
  onBulkDelete?: (documentIds: string[]) => void;
  onBulkReindex?: (documentIds: string[]) => void;
};

function StatusPill({
  state,
  requiresReindex,
}: {
  state?: DocumentIndexState;
  requiresReindex?: boolean;
}) {
  if (requiresReindex && state?.status === "ready") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
        ⚠ Requires Re-index
      </span>
    );
  }

  if (!state) {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        Pending
      </span>
    );
  }

  if (state.status === "ready") {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        ✓ Ready
      </span>
    );
  }

  if (state.status === "failed") {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
        ❌ Failed
      </span>
    );
  }

  return (
    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      ⏳ Indexing
    </span>
  );
}

function formatIndexedDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const SORT_OPTIONS: Array<{ value: LibrarySortKey; label: string }> = [
  { value: "recently-indexed", label: "Recently Indexed" },
  { value: "recently-used", label: "Recently Used" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "file-size", label: "File Size" },
  { value: "document-type", label: "Document Type" },
];

export function PdfUploadManager({
  pdfs,
  indexStates = {},
  onAdd,
  onRemove,
  onOpen,
  onRetry,
  onCancel,
  onParseCancelled,
  onError,
  onToggleEnabled,
  onTagsChange,
  onBulkEnable,
  onBulkDelete,
  onBulkReindex,
}: PdfUploadManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const parseAbortRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<LibrarySortKey>(() =>
    loadLibrarySortPreference(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagEditorId, setTagEditorId] = useState<string | null>(null);

  function cancelParsing() {
    parseAbortRef.current = true;
    setIsLoading(false);
    onParseCancelled?.();
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleSortChange(next: LibrarySortKey) {
    setSortKey(next);
    saveLibrarySortPreference(next);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    parseAbortRef.current = false;
    setIsLoading(true);

    try {
      const blobUrl = URL.createObjectURL(file);
      const { parsePdf } = await import("@/lib/pdf/parsePdf.client");

      try {
        const { totalPages, text, pages } = await parsePdf(file);

        if (parseAbortRef.current) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        await onAdd(
          {
            fileName: file.name,
            fileSize: file.size,
            totalPages,
            text,
            pages,
            blobUrl,
          },
          file,
        );
      } catch (parseError) {
        URL.revokeObjectURL(blobUrl);
        throw parseError;
      }
    } catch (err) {
      if (parseAbortRef.current) {
        return;
      }

      const message =
        err instanceof Error ? err.message : "Failed to parse PDF.";
      setError(message);
      onError?.();
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const filteredSorted = useMemo(() => {
    const filtered = pdfs.filter((pdf) => {
      if (
        !matchesLibraryQuery(
          {
            id: pdf.id,
            fileName: pdf.fileName,
            tags: pdf.tags,
            documentType: pdf.documentType,
          },
          searchQuery,
        )
      ) {
        return false;
      }

      if (tagFilter && !(pdf.tags ?? []).includes(tagFilter)) {
        return false;
      }

      return true;
    });

    return sortLibraryDocuments(
      filtered.map((pdf) => ({
        ...pdf,
        fileName: pdf.fileName,
      })),
      sortKey,
    );
  }, [pdfs, searchQuery, tagFilter, sortKey]);

  const recentDocuments = useMemo(() => {
    return sortLibraryDocuments(
      pdfs.filter((pdf) => Boolean(pdf.lastUsedAt)),
      "recently-used",
    ).slice(0, 5);
  }, [pdfs]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredSorted.map((pdf) => pdf.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedList = [...selectedIds];

  return (
    <ManagerSection
      title={
        pdfs.length > 0
          ? `Knowledge Library (${pdfs.length})`
          : "Knowledge Library"
      }
      description={`Multi-document standards & manuals · up to ${MAX_PDF_SIZE_LABEL}`}
      icon={<PdfIcon />}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        disabled={isLoading}
        onChange={(event) => void handleChange(event)}
      />

      {isLoading && (
        <div className="mb-3">
          <DocumentIndexProgressCard
            filename="Uploading PDF"
            state={{
              documentId: "parsing",
              filename: "Uploading PDF",
              status: "indexing",
              stage: "extracting",
              progressPercent: 12,
              updatedAt: new Date().toISOString(),
            }}
            onCancel={cancelParsing}
            compact
          />
        </div>
      )}

      {error && (
        <p
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {pdfs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-5 text-center">
          <p className="text-sm text-slate-500">
            No documents in the Knowledge Library yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Upload standards, manuals and guides — each stays independently
            indexed
          </p>
          <div className="mt-3">
            <AddButton
              label="Add PDF"
              onClick={openFilePicker}
              disabled={isLoading}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search filename, tags, type, AS3000…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-medium text-slate-500">
                Sort
              </label>
              <select
                value={sortKey}
                onChange={(event) =>
                  handleSortChange(event.target.value as LibrarySortKey)
                }
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                  tagFilter === null
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                All tags
              </button>
              {LIBRARY_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setTagFilter((current) => (current === tag ? null : tag))
                  }
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    tagFilter === tag
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {recentDocuments.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Recent Documents
              </p>
              <ul className="mt-1.5 space-y-1">
                {recentDocuments.map((pdf) => (
                  <li key={`recent-${pdf.id}`}>
                    <button
                      type="button"
                      onClick={() => onOpen?.(pdf.id)}
                      className="w-full truncate text-left text-xs text-violet-700 hover:underline"
                    >
                      {pdf.fileName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={selectAllVisible}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Select visible
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() =>
                onBulkEnable?.(
                  pdfs.map((pdf) => pdf.id),
                  true,
                )
              }
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() =>
                onBulkEnable?.(
                  pdfs.map((pdf) => pdf.id),
                  false,
                )
              }
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
            >
              Disable All
            </button>
            <button
              type="button"
              disabled={selectedList.length === 0}
              onClick={() => onBulkReindex?.(selectedList)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Re-index Selected
            </button>
            <button
              type="button"
              disabled={selectedList.length === 0}
              onClick={() => {
                onBulkDelete?.(selectedList);
                clearSelection();
              }}
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 hover:bg-red-100 disabled:opacity-40"
            >
              Delete Selected
            </button>
          </div>

          {filteredSorted.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-sm text-slate-500">
              No documents match this search.
            </p>
          ) : (
            <ul className="space-y-3">
              {filteredSorted.map((pdf) => {
                const state = indexStates[pdf.id];
                const indexedLabel = formatIndexedDate(
                  pdf.indexedAt ?? state?.updatedAt,
                );
                const chunkCount = pdf.chunkCount ?? state?.chunkCount;
                const enabled = pdf.enabled !== false;
                const selected = selectedIds.has(pdf.id);

                return (
                  <li key={pdf.id} className="space-y-2">
                    <div
                      className={`rounded-lg border px-3 py-2.5 ${
                        enabled
                          ? "border-slate-200 bg-slate-50/60"
                          : "border-slate-200 bg-slate-100/80 opacity-80"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelected(pdf.id)}
                          className="mt-1 h-3.5 w-3.5 rounded border-slate-300"
                          aria-label={`Select ${pdf.fileName}`}
                        />
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm">
                          <PdfIcon />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className="truncate text-sm font-medium text-slate-800"
                              title={pdf.fileName}
                            >
                              {pdf.fileName}
                            </p>
                            <StatusPill
                              state={state}
                              requiresReindex={pdf.requiresReindex}
                            />
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {formatFileSize(pdf.fileSize)} · {pdf.totalPages}{" "}
                            {pdf.totalPages === 1 ? "page" : "pages"}
                            {pdf.documentType
                              ? ` · ${pdf.documentType}`
                              : null}
                            {indexedLabel ? ` · Indexed ${indexedLabel}` : null}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Chunks: {chunkCount ?? "—"}
                            {pdf.embeddingModel
                              ? ` · Model: ${pdf.embeddingModel}`
                              : null}
                            {pdf.knowledgeBaseVersion
                              ? ` · KB v${pdf.knowledgeBaseVersion}`
                              : null}
                          </p>
                          {(pdf.tags?.length ?? 0) > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {pdf.tags!.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] text-slate-600"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(event) =>
                                onToggleEnabled?.(pdf.id, event.target.checked)
                              }
                              className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600"
                            />
                            Enabled
                          </label>
                          <DeleteButton
                            label={`Delete ${pdf.fileName}`}
                            onClick={() => onRemove(pdf.id)}
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {onOpen && (
                          <button
                            type="button"
                            onClick={() => onOpen(pdf.id)}
                            className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                          >
                            Open
                          </button>
                        )}
                        {onRetry && state?.status !== "indexing" && (
                          <button
                            type="button"
                            onClick={() => onRetry(pdf.id)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Re-index
                          </button>
                        )}
                        {onTagsChange && (
                          <button
                            type="button"
                            onClick={() =>
                              setTagEditorId((current) =>
                                current === pdf.id ? null : pdf.id,
                              )
                            }
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Tags
                          </button>
                        )}
                      </div>

                      {tagEditorId === pdf.id && onTagsChange && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
                          {LIBRARY_TAG_OPTIONS.map((tag) => {
                            const active = (pdf.tags ?? []).includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const current = new Set(pdf.tags ?? []);
                                  if (current.has(tag)) {
                                    current.delete(tag);
                                  } else {
                                    current.add(tag);
                                  }
                                  onTagsChange(pdf.id, [...current]);
                                }}
                                className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                  active
                                    ? "border-violet-300 bg-violet-50 text-violet-700"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {state && state.status === "indexing" && (
                      <DocumentIndexProgressCard
                        filename={pdf.fileName}
                        state={state}
                        onRetry={onRetry ? () => onRetry(pdf.id) : undefined}
                        onCancel={
                          onCancel ? () => onCancel(pdf.id) : undefined
                        }
                        compact
                      />
                    )}

                    {state?.status === "failed" && (
                      <DocumentIndexProgressCard
                        filename={pdf.fileName}
                        state={state}
                        onRetry={onRetry ? () => onRetry(pdf.id) : undefined}
                        compact
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex justify-center">
            <AddButton
              label="Add PDF"
              onClick={openFilePicker}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </ManagerSection>
  );
}
