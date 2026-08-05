import type { LibraryDocumentSummary, PdfPageText } from "@/types/rag";

export type LibraryLookupResult = {
  found: boolean;
  documentId?: string;
  filename?: string;
  contentHash?: string;
  fileSize?: number;
  totalPages?: number;
  indexedAt?: string;
  hasPdf?: boolean;
  status?: "indexing" | "ready" | "failed";
  chunkCount?: number;
};

export type LibraryDocumentDetail = {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  hasPdf: boolean;
  text: string;
  pages: PdfPageText[];
};

export async function fetchDocumentLibrary(): Promise<LibraryDocumentSummary[]> {
  const response = await fetch("/api/rag/library", { cache: "no-store" });

  if (!response.ok) {
    console.warn("[RAG:library] Failed to load document library.");
    return [];
  }

  const payload = (await response.json()) as {
    documents?: LibraryDocumentSummary[];
  };
  return payload.documents ?? [];
}

export async function lookupLibraryByHash(
  contentHash: string,
): Promise<LibraryLookupResult> {
  const response = await fetch(
    `/api/rag/library/by-hash/${encodeURIComponent(contentHash)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return { found: false };
  }

  return (await response.json()) as LibraryLookupResult;
}

export async function fetchLibraryDocument(
  documentId: string,
): Promise<LibraryDocumentDetail | null> {
  const response = await fetch(
    `/api/rag/library/${encodeURIComponent(documentId)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as LibraryDocumentDetail;
}

export async function uploadLibraryPdf(
  documentId: string,
  file: Blob,
): Promise<void> {
  const response = await fetch(
    `/api/rag/library/${encodeURIComponent(documentId)}/file`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
      },
      body: file,
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || "Unable to save the PDF file.");
  }
}

export async function createLibraryPdfBlobUrl(
  documentId: string,
): Promise<string | null> {
  const response = await fetch(
    `/api/rag/library/${encodeURIComponent(documentId)}/file`,
    { cache: "force-cache" },
  );

  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function libraryPdfFileUrl(documentId: string): string {
  return `/api/rag/library/${encodeURIComponent(documentId)}/file`;
}
