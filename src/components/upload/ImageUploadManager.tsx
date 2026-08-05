"use client";

import { useRef, useState } from "react";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_LABEL,
  getImageSizeError,
} from "@/lib/upload/limits";
import type { LibraryImageDocument } from "@/types/image";
import type { DocumentIndexState } from "@/types/rag";
import { DocumentIndexProgressCard } from "./DocumentIndexProgressCard";
import { AddButton, DeleteButton } from "./ManagerActions";
import { ManagerSection } from "./ManagerSection";
import { ImageIcon } from "./UploadIcons";

type ImageUploadManagerProps = {
  images: LibraryImageDocument[];
  indexStates?: Record<string, DocumentIndexState>;
  onAdd: (files: File[]) => void | Promise<void>;
  onRemove: (id: string) => void;
  onOpen?: (id: string) => void;
  onRetry?: (documentId: string) => void;
  onCancel?: (documentId: string) => void;
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

function formatUploadDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ImageUploadManager({
  images,
  indexStates = {},
  onAdd,
  onRemove,
  onOpen,
  onRetry,
  onCancel,
}: ImageUploadManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const accepted: File[] = [];
    const rejectedNames: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        rejectedNames.push(file.name);
      } else {
        accepted.push(file);
      }
    }

    if (rejectedNames.length > 0) {
      const rejectedList = rejectedNames.join(", ");
      setError(
        rejectedNames.length === 1
          ? getImageSizeError(rejectedNames[0])
          : `Each image must be ${MAX_IMAGE_SIZE_LABEL} or smaller. Skipped: ${rejectedList}`,
      );
    } else {
      setError(null);
    }

    if (accepted.length > 0) {
      setIsAdding(true);
      try {
        await onAdd(accepted);
      } finally {
        setIsAdding(false);
      }
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <ManagerSection
      title={images.length > 0 ? `Images (${images.length})` : "Images"}
      description={`Vision OCR · up to ${MAX_IMAGE_SIZE_LABEL} · PNG, JPG, WEBP`}
      icon={<ImageIcon />}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/*"
        multiple
        className="sr-only"
        disabled={isAdding}
        onChange={(event) => void handleChange(event)}
      />

      {error && (
        <p
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-5 text-center">
          <p className="text-sm text-slate-500">No images in the library yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Nameplates, switchboards, diagrams and labels become searchable
          </p>
          <div className="mt-3">
            <AddButton
              label="Add Images"
              onClick={openFilePicker}
              disabled={isAdding}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {images.map((image) => {
              const state = indexStates[image.id];
              const uploadedLabel = formatUploadDate(
                image.indexedAt ?? state?.updatedAt,
              );

              return (
                <li key={image.id} className="space-y-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onOpen?.(image.id)}
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                        aria-label={`Open ${image.fileName}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.previewUrl}
                          alt={image.fileName}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className="truncate text-sm font-medium text-slate-800"
                            title={image.fileName}
                          >
                            {image.fileName}
                          </p>
                          <StatusPill state={state} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {uploadedLabel
                            ? `Uploaded ${uploadedLabel}`
                            : "Uploading…"}
                          {image.chunkCount != null
                            ? ` · ${image.chunkCount} chunks`
                            : null}
                        </p>
                      </div>
                      <DeleteButton
                        label={`Delete ${image.fileName}`}
                        onClick={() => onRemove(image.id)}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {onOpen && (
                        <button
                          type="button"
                          onClick={() => onOpen(image.id)}
                          className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                        >
                          Open
                        </button>
                      )}
                      {onRetry && state?.status !== "indexing" && (
                        <button
                          type="button"
                          onClick={() => onRetry(image.id)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Re-index
                        </button>
                      )}
                    </div>
                  </div>

                  {state && state.status === "indexing" && (
                    <DocumentIndexProgressCard
                      filename={image.fileName}
                      state={state}
                      variant="image"
                      onRetry={onRetry ? () => onRetry(image.id) : undefined}
                      onCancel={
                        onCancel ? () => onCancel(image.id) : undefined
                      }
                      compact
                    />
                  )}

                  {state?.status === "failed" && (
                    <DocumentIndexProgressCard
                      filename={image.fileName}
                      state={state}
                      variant="image"
                      onRetry={onRetry ? () => onRetry(image.id) : undefined}
                      compact
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex justify-center">
            <AddButton
              label="Add Images"
              onClick={openFilePicker}
              disabled={isAdding}
            />
          </div>
        </div>
      )}
    </ManagerSection>
  );
}
