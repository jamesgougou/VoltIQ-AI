"use client";

import { useState } from "react";
import { PDFPreview } from "@/components/PDFPreview";
import { PDFUploader } from "@/components/PDFUploader";
import { ImageUploadCard } from "@/components/upload/ImageUploadCard";
import { TextPasteCard } from "@/components/upload/TextPasteCard";
import type { PdfParseResult } from "@/types/pdf";

export function UploadSection() {
  const [pdfData, setPdfData] = useState<PdfParseResult | null>(null);

  function handleParsed(result: PdfParseResult) {
    setPdfData(result);
  }

  function handleError() {
    setPdfData(null);
  }

  return (
    <section>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Add your content
        </h2>
        <p className="mt-2 text-slate-500">
          Upload documents, images, or paste text to get started with VoltIQ
          AI.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <PDFUploader onParsed={handleParsed} onError={handleError} />
        <ImageUploadCard />
        <TextPasteCard />
      </div>

      {pdfData && pdfData.text && (
        <div className="mt-8">
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
