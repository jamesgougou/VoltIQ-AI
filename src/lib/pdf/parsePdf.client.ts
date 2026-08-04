"use client";

import {
  MAX_PDF_SIZE_BYTES,
  getPdfSizeError,
} from "@/lib/upload/limits";

function extractPageText(
  items: Array<{ str?: string } | { type: string }>,
): string {
  return items
    .map((item) => ("str" in item ? (item.str ?? "") : ""))
    .join(" ")
    .trim();
}

export async function parsePdf(
  file: File,
): Promise<{ totalPages: number; text: string }> {
  if (typeof window === "undefined") {
    throw new Error("PDF parsing is only available in the browser.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("Please select a valid PDF file.");
  }

  const maxSizeBytes = MAX_PDF_SIZE_BYTES;
  if (file.size > maxSizeBytes) {
    throw new Error(getPdfSizeError());
  }

  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });

  try {
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = extractPageText(content.items);

      if (pageText) {
        pageTexts.push(pageText);
      }
    }

    const text = pageTexts.join("\n\n").trim();

    if (!text) {
      throw new Error(
        "No extractable text found. This PDF may contain only scanned images.",
      );
    }

    return { totalPages, text };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Unable to read this PDF. The file may be corrupted or password-protected.",
    );
  } finally {
    await loadingTask.destroy();
  }
}
