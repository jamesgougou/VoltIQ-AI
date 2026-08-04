"use client";

import { useRef, useState } from "react";
import type { PdfParseResult } from "@/types/pdf";
import { UploadCard } from "@/components/upload/UploadCard";
import { PdfIcon } from "@/components/upload/UploadIcons";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type PDFUploaderProps = {
  onParsed: (result: PdfParseResult) => void;
  onError?: () => void;
  onClear?: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

export function PDFUploader({
  onParsed,
  onError,
  onClear,
  onLoadingChange,
}: PDFUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setLoading(next: boolean) {
    setIsLoading(next);
    onLoadingChange?.(next);
  }

  function handleRemove() {
    setFileName(null);
    setIsSuccess(false);
    setError(null);
    setLoading(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClear?.();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setIsSuccess(false);
    setLoading(true);

    try {
      const { parsePdf } = await import("@/lib/pdf/parsePdf.client");
      const { totalPages, text } = await parsePdf(file);
      onParsed({
        fileName: file.name,
        fileSize: file.size,
        totalPages,
        text,
      });
      setIsSuccess(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to parse PDF.";
      setError(message);
      setIsSuccess(false);
      onError?.();
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <UploadCard
      title="Upload PDF"
      description="Drop a PDF document or click to browse."
      icon={<PdfIcon />}
      status={
        isLoading ? "loading" : isSuccess ? "success" : error ? "error" : null
      }
    >
      <div className="relative">
        <label
          htmlFor="pdf-upload"
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
            isSuccess
              ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-400"
              : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
          } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={inputRef}
            id="pdf-upload"
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={isLoading}
            onChange={handleChange}
          />
          {isLoading ? (
            <LoadingSpinner label="Parsing PDF..." />
          ) : isSuccess && fileName ? (
            <>
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </span>
              <span className="text-sm font-medium text-emerald-800">
                Upload successful
              </span>
              <span className="mt-1 max-w-full truncate px-2 text-xs text-slate-500">
                {fileName}
              </span>
              <span className="mt-2 text-xs text-slate-400">
                Click to replace
              </span>
            </>
          ) : (
            <>
              <svg
                className="mb-2 h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <span className="text-sm font-medium text-slate-600">
                {fileName ?? "Choose PDF file"}
              </span>
              <span className="mt-1 text-xs text-slate-400">
                PDF up to 10 MB
              </span>
            </>
          )}
        </label>
      </div>

      {error && (
        <p
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {(fileName || error) && !isLoading && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      )}
    </UploadCard>
  );
}
