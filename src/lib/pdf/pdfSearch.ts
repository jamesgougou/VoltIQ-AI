import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  buildNormalizedIndex,
  extractTextItems,
  normalizeSearchQuery,
} from "./textMatch";

export type PdfSearchHit = {
  pageNumber: number;
  /** 0-based index among matches on this page. */
  localIndex: number;
};

function pagePlainText(
  items: ReturnType<typeof extractTextItems>,
): string {
  return items.map((item) => item.str).join(" ");
}

export async function searchPdfDocument(
  pdf: PDFDocumentProxy,
  query: string,
  onProgress?: (hits: PdfSearchHit[], scannedPages: number) => void,
  signal?: AbortSignal,
): Promise<PdfSearchHit[]> {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const hits: PdfSearchHit[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    if (signal?.aborted) {
      throw new DOMException("Search aborted", "AbortError");
    }

    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = extractTextItems(textContent.items);
    const { normalized } = buildNormalizedIndex(pagePlainText(items));

    let fromIndex = 0;
    let localIndex = 0;

    while (fromIndex < normalized.length) {
      const matchIndex = normalized.indexOf(normalizedQuery, fromIndex);
      if (matchIndex === -1) {
        break;
      }

      hits.push({ pageNumber, localIndex });
      localIndex += 1;
      fromIndex = matchIndex + Math.max(normalizedQuery.length, 1);
    }

    if (pageNumber % 8 === 0) {
      onProgress?.([...hits], pageNumber);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  return hits;
}
