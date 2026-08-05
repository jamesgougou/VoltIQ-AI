import type { PdfPageText } from "@/types/rag";

export type PdfParseResult = {
  fileName: string;
  fileSize: number;
  totalPages: number;
  text: string;
  pages: PdfPageText[];
  /** Object URL for the original PDF bytes (session-scoped). */
  blobUrl?: string;
};

export type PdfDocument = PdfParseResult & {
  id: string;
  blobUrl: string;
};

/** Lightweight registry entry used by the interactive PDF viewer. */
export type PdfSourceRef = {
  documentId: string;
  fileName: string;
  blobUrl: string;
  totalPages: number;
};

export const PDF_PREVIEW_CHAR_LIMIT = 3000;
