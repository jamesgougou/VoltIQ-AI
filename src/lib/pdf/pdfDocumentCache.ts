import type { PDFDocumentProxy } from "pdfjs-dist";
import { ensurePdfWorker } from "./pdfWorker";

type CacheEntry = {
  document: PDFDocumentProxy;
  url: string;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PDFDocumentProxy>>();

export async function getCachedPdfDocument(
  documentId: string,
  url: string,
): Promise<PDFDocumentProxy> {
  const existing = cache.get(documentId);

  if (existing && existing.url === url) {
    return existing.document;
  }

  if (existing) {
    await destroyCachedPdfDocument(documentId);
  }

  const pending = inflight.get(documentId);
  if (pending) {
    return pending;
  }

  const loadPromise = (async () => {
    const pdfjs = await ensurePdfWorker();
    const loadingTask = pdfjs.getDocument({ url });
    const document = await loadingTask.promise;
    cache.set(documentId, { document, url });
    return document;
  })();

  inflight.set(documentId, loadPromise);

  try {
    return await loadPromise;
  } finally {
    inflight.delete(documentId);
  }
}

export async function destroyCachedPdfDocument(
  documentId: string,
): Promise<void> {
  const entry = cache.get(documentId);
  cache.delete(documentId);
  inflight.delete(documentId);

  if (!entry) {
    return;
  }

  try {
    await entry.document.cleanup();
    await entry.document.loadingTask.destroy();
  } catch {
    // Ignore cleanup errors for already-released documents.
  }
}

export async function clearPdfDocumentCache(): Promise<void> {
  const ids = [...cache.keys()];
  await Promise.all(ids.map((id) => destroyCachedPdfDocument(id)));
}
