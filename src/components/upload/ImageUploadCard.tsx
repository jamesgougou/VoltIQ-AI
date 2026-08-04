"use client";

import { useState } from "react";
import { UploadCard } from "./UploadCard";
import { ImageIcon } from "./UploadIcons";

export function ImageUploadCard() {
  const [fileNames, setFileNames] = useState<string[]>([]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    setFileNames(Array.from(files).map((file) => file.name));
  }

  const label =
    fileNames.length === 0
      ? "Choose image files"
      : fileNames.length === 1
        ? fileNames[0]
        : `${fileNames.length} images selected`;

  return (
    <UploadCard
      title="Upload Images"
      description="Drop images or click to browse multiple files."
      icon={<ImageIcon />}
    >
      <label
        htmlFor="image-upload"
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
      >
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleChange}
        />
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
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP</span>
      </label>
    </UploadCard>
  );
}
