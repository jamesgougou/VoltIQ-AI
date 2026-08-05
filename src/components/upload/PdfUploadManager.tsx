"use client";

import { useRef, useState } from "react";
import { formatFileSize } from "@/lib/format";
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
};

function StatusPill({ state }: { state?: DocumentIndexState }) {
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
        Failed
      </span>
    );
  }

  return (
    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
      Indexing...
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
}: PdfUploadManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const parseAbortRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancelParsing() {
    parseAbortRef.current = true;
    setIsLoading(false);
    onParseCancelled?.();
  }

  function openFilePicker() {
    inputRef.current?.click();
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

  return (
    <ManagerSection
      title={pdfs.length > 0 ? `Library (${pdfs.length})` : "Document Library"}
      description={`Persistent PDFs · up to ${MAX_PDF_SIZE_LABEL}`}
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
          <p className="text-sm text-slate-500">No documents in the library yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Upload once — documents persist across sessions
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
          <ul className="space-y-3">
            {pdfs.map((pdf) => {
              const state = indexStates[pdf.id];
              const indexedLabel = formatIndexedDate(
                pdf.indexedAt ?? state?.updatedAt,
              );

              return (
                <li key={pdf.id} className="space-y-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                    <div className="flex items-start gap-3">
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
                          <StatusPill state={state} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatFileSize(pdf.fileSize)} · {pdf.totalPages}{" "}
                          {pdf.totalPages === 1 ? "page" : "pages"}
                          {indexedLabel ? ` · Indexed ${indexedLabel}` : null}
                        </p>
                      </div>
                      <DeleteButton
                        label={`Delete ${pdf.fileName}`}
                        onClick={() => onRemove(pdf.id)}
                      />
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
                    </div>
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
