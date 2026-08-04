"use client";

import { useState } from "react";
import { PDFPreview } from "@/components/PDFPreview";
import { PDFUploader } from "@/components/PDFUploader";
import { DocumentSummary } from "@/components/upload/DocumentSummary";
import { ImageUploadCard } from "@/components/upload/ImageUploadCard";
import { TextPasteCard } from "@/components/upload/TextPasteCard";
import type { PdfParseResult } from "@/types/pdf";

export function UploadSection() {
  const [pdfData, setPdfData] = useState<PdfParseResult | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function handleParsed(result: PdfParseResult) {
    setPdfData(result);
  }

  function handleError() {
    setPdfData(null);
  }

  function handlePdfClear() {
    setPdfData(null);
  }

  function handleClearAll() {
    setPdfData(null);
    setResetKey((key) => key + 1);
  }

  const hasPdf = Boolean(pdfData?.text);

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Add your content
          </h2>
          <p className="mt-2 text-slate-500">
            Upload documents, images, or paste text to get started with VoltIQ
            AI.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          Clear All
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PDFUploader
          key={`pdf-${resetKey}`}
          onParsed={handleParsed}
          onError={handleError}
          onClear={handlePdfClear}
        />
        <ImageUploadCard key={`images-${resetKey}`} />
        <TextPasteCard key={`text-${resetKey}`} />
      </div>

      {hasPdf && pdfData && (
        <div className="mt-8 space-y-6">
          <DocumentSummary
            fileName={pdfData.fileName}
            fileSize={pdfData.fileSize}
            totalPages={pdfData.totalPages}
            totalCharacters={pdfData.text.length}
          />
          <PDFPreview
            fileName={pdfData.fileName}
            totalPages={pdfData.totalPages}
            text={pdfData.text}
          />
        </div>
      )}
    </section>
  );
}
