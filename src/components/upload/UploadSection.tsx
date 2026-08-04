"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ImageUploadManager } from "@/components/upload/ImageUploadManager";
import { PdfUploadManager } from "@/components/upload/PdfUploadManager";
import { TextPasteManager } from "@/components/upload/TextPasteManager";
import type { PdfDocument, PdfParseResult } from "@/types/pdf";

export function UploadSection() {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [hasImages, setHasImages] = useState(false);
  const [hasText, setHasText] = useState(false);

  function handlePdfAdd(result: PdfParseResult) {
    setPdfs((current) => [
      ...current,
      {
        ...result,
        id: crypto.randomUUID(),
      },
    ]);
  }

  function handlePdfRemove(id: string) {
    setPdfs((current) => current.filter((pdf) => pdf.id !== id));
  }

  function handleClearAll() {
    setPdfs([]);
    setHasImages(false);
    setHasText(false);
    setResetKey((key) => key + 1);
  }

  const hasDocuments = pdfs.length > 0 || hasImages || hasText;

  return (
    <section className="flex flex-col gap-6">
      <ChatPanel hasDocuments={hasDocuments} />

      <section
        className="rounded-xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="documents-heading"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <h2
              id="documents-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Documents
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              PDFs, images, and pasted text used as AI context
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:text-sm"
          >
            Clear All
          </button>
        </div>

        <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-3">
          <PdfUploadManager
            key={`pdf-${resetKey}`}
            pdfs={pdfs}
            onAdd={handlePdfAdd}
            onRemove={handlePdfRemove}
          />
          <ImageUploadManager
            key={`images-${resetKey}`}
            onHasContentChange={setHasImages}
          />
          <TextPasteManager
            key={`text-${resetKey}`}
            onHasContentChange={setHasText}
          />
        </div>
      </section>
    </section>
  );
}
