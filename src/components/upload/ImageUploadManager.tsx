"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGE_SIZE_LABEL,
  getImageSizeError,
} from "@/lib/upload/limits";
import { AddButton, DeleteButton } from "./ManagerActions";
import { ManagerSection } from "./ManagerSection";
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

type ImageUploadManagerProps = {
  onHasContentChange?: (hasContent: boolean) => void;
};

export function ImageUploadManager({
  onHasContentChange,
}: ImageUploadManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImageItem[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
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
      setImages((prev) => [...prev, ...createImageItems(accepted)]);
    }

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

  return (
    <ManagerSection
      title={images.length > 0 ? `Images (${images.length})` : "Images"}
      description={`Up to ${MAX_IMAGE_SIZE_LABEL} per image · PNG, JPG, WEBP`}
      icon={<ImageIcon />}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleChange}
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
          <p className="text-sm text-slate-500">No images uploaded yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Up to {MAX_IMAGE_SIZE_LABEL} per image
          </p>
          <div className="mt-3">
            <AddButton label="Add Images" onClick={openFilePicker} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <li
                key={image.id}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60"
              >
                <div className="relative aspect-square bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <span
                    className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700"
                    title={image.name}
                  >
                    {image.name}
                  </span>
                  <DeleteButton
                    label={`Delete ${image.name}`}
                    onClick={() => handleRemove(image.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex justify-center">
            <AddButton label="Add Images" onClick={openFilePicker} />
          </div>
        </div>
      )}
    </ManagerSection>
  );
}
