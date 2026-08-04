"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCard } from "./UploadCard";
import { ImageIcon } from "./UploadIcons";

type ImageItem = {
  id: string;
  name: string;
  url: string;
};

function createImageItems(files: FileList | File[]): ImageItem[] {
  return Array.from(files).map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    name: file.name,
    url: URL.createObjectURL(file),
  }));
}

function revokeUrls(items: ImageItem[]) {
  for (const item of items) {
    URL.revokeObjectURL(item.url);
  }
}

type ImageUploadCardProps = {
  onHasContentChange?: (hasContent: boolean) => void;
};

export function ImageUploadCard({ onHasContentChange }: ImageUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImageItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    onHasContentChange?.(images.length > 0);
  }, [images, onHasContentChange]);

  useEffect(() => {
    return () => {
      revokeUrls(imagesRef.current);
    };
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImages((prev) => {
      revokeUrls(prev);
      return createImageItems(files);
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleRemove(id: string) {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  }

  function handleClearAll() {
    setImages((prev) => {
      revokeUrls(prev);
      return [];
    });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const hasImages = images.length > 0;

  return (
    <UploadCard
      title="Upload Images"
      description="Drop images or click to browse multiple files."
      icon={<ImageIcon />}
      status={hasImages ? "success" : null}
      actions={
        hasImages ? (
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Clear All
          </button>
        ) : undefined
      }
    >
      <label
        htmlFor="image-upload"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
          hasImages
            ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-400"
            : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
        }`}
      >
        <input
          ref={inputRef}
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleChange}
        />
        {hasImages ? (
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
              {images.length} {images.length === 1 ? "image" : "images"} ready
            </span>
            <span className="mt-1 text-xs text-slate-400">
              Click to replace selection
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
              Choose image files
            </span>
            <span className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP</span>
          </>
        )}
      </label>

      {hasImages && (
        <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto">
          {images.map((image) => (
            <li
              key={image.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.name}
                className="h-12 w-12 shrink-0 rounded-md object-cover"
              />
              <span
                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700"
                title={image.name}
              >
                {image.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(image.id)}
                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                aria-label={`Remove ${image.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </UploadCard>
  );
}
