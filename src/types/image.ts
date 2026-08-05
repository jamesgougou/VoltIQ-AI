export type LibraryImageDocument = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Local preview URL (blob) or library-served URL. */
  previewUrl: string;
  contentHash?: string;
  indexedAt?: string;
  enabled?: boolean;
  ocrText?: string;
  description?: string;
  chunkCount?: number;
};
