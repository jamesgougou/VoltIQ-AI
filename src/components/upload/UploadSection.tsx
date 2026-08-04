"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import {
  clearRagIndex,
  deleteDocumentFromRag,
  hashDocumentContent,
  indexDocumentInRag,
} from "@/lib/rag/client";
import { ImageUploadManager } from "@/components/upload/ImageUploadManager";
import { PdfUploadManager } from "@/components/upload/PdfUploadManager";
import { TextPasteManager } from "@/components/upload/TextPasteManager";
import type { DocumentContextItem } from "@/types/documentContext";
import type { PdfDocument, PdfParseResult } from "@/types/pdf";
import { PASTED_TEXT_DOCUMENT_ID } from "@/types/rag";

export function UploadSection() {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [hasImages, setHasImages] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const indexedHashesRef = useRef<Map<string, string>>(new Map());

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

  async function handleClearAll() {
    setPdfs([]);
    setHasImages(false);
    setHasText(false);
    setPastedText("");
    setResetKey((key) => key + 1);

    try {
      await clearRagIndex();
      indexedHashesRef.current.clear();
    } catch (error) {
      console.error("Failed to clear document index:", error);
    }
  }

  const hasDocuments = pdfs.length > 0 || hasImages || hasText;

  const documents = useMemo((): DocumentContextItem[] => {
    const items: DocumentContextItem[] = pdfs.map((pdf) => ({
      id: pdf.id,
      name: pdf.fileName,
      text: pdf.text,
    }));

    if (pastedText.trim()) {
      items.push({
        id: PASTED_TEXT_DOCUMENT_ID,
        name: "Pasted Text",
        text: pastedText,
      });
    }

    return items;
  }, [pdfs, pastedText]);

  useEffect(() => {
    let cancelled = false;

    async function syncPdfIndexes() {
      const currentIds = new Set(pdfs.map((pdf) => pdf.id));

      for (const documentId of [...indexedHashesRef.current.keys()]) {
        if (
          documentId !== PASTED_TEXT_DOCUMENT_ID &&
          !currentIds.has(documentId)
        ) {
          try {
            await deleteDocumentFromRag(documentId);
            indexedHashesRef.current.delete(documentId);
          } catch (error) {
            console.error("Failed to delete document index:", error);
          }
        }
      }

      for (const pdf of pdfs) {
        if (cancelled) {
          return;
        }

        try {
          const contentHash = await hashDocumentContent(pdf.text);

          if (indexedHashesRef.current.get(pdf.id) === contentHash) {
            continue;
          }

          await indexDocumentInRag({
            documentId: pdf.id,
            documentName: pdf.fileName,
            text: pdf.text,
            pages: pdf.pages,
            contentHash,
          });

          indexedHashesRef.current.set(pdf.id, contentHash);
        } catch (error) {
          console.error(`Failed to index ${pdf.fileName}:`, error);
        }
      }
    }

    void syncPdfIndexes();

    return () => {
      cancelled = true;
    };
  }, [pdfs]);

  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      if (cancelled) {
        return;
      }

      if (!pastedText.trim()) {
        if (indexedHashesRef.current.has(PASTED_TEXT_DOCUMENT_ID)) {
          try {
            await deleteDocumentFromRag(PASTED_TEXT_DOCUMENT_ID);
            indexedHashesRef.current.delete(PASTED_TEXT_DOCUMENT_ID);
          } catch (error) {
            console.error("Failed to delete pasted text index:", error);
          }
        }
        return;
      }

      try {
        const contentHash = await hashDocumentContent(pastedText);

        if (
          indexedHashesRef.current.get(PASTED_TEXT_DOCUMENT_ID) === contentHash
        ) {
          return;
        }

        await indexDocumentInRag({
          documentId: PASTED_TEXT_DOCUMENT_ID,
          documentName: "Pasted Text",
          text: pastedText,
          contentHash,
        });

        indexedHashesRef.current.set(PASTED_TEXT_DOCUMENT_ID, contentHash);
      } catch (error) {
        console.error("Failed to index pasted text:", error);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [pastedText]);

  return (
    <section className="flex flex-col gap-6">
      <ChatPanel hasDocuments={hasDocuments} documents={documents} />

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
            onClick={() => void handleClearAll()}
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
            onTextChange={setPastedText}
          />
        </div>
      </section>
    </section>
  );
}
