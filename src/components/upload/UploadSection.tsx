"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import {
  clearRagIndex,
  deleteDocumentFromRag,
  fetchDocumentIndexStatuses,
  hashDocumentContent,
  indexDocumentInRag,
  mergeIndexStates,
} from "@/lib/rag/client";
import { ImageUploadManager } from "@/components/upload/ImageUploadManager";
import { PdfUploadManager } from "@/components/upload/PdfUploadManager";
import { TextPasteManager } from "@/components/upload/TextPasteManager";
import type { DocumentContextItem } from "@/types/documentContext";
import type { PdfDocument, PdfParseResult } from "@/types/pdf";
import type { DocumentIndexState } from "@/types/rag";
import { PASTED_TEXT_DOCUMENT_ID } from "@/types/rag";

function createIndexingState(
  documentId: string,
  filename: string,
): DocumentIndexState {
  return {
    documentId,
    filename,
    status: "indexing",
    updatedAt: new Date().toISOString(),
  };
}

export function UploadSection() {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [hasImages, setHasImages] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [indexStates, setIndexStates] = useState<
    Record<string, DocumentIndexState>
  >({});
  const indexedHashesRef = useRef<Map<string, string>>(new Map());

  function updateIndexState(state: DocumentIndexState) {
    setIndexStates((current) => ({
      ...current,
      [state.documentId]: state,
    }));
  }

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
    setIndexStates({});
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
      totalPages: pdf.totalPages,
      fileSize: pdf.fileSize,
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

  async function indexDocumentEntry(
    documentId: string,
    documentName: string,
    text: string,
    pages?: PdfParseResult["pages"],
  ) {
    console.info(`[RAG:client] Starting indexing for ${documentName}.`);
    updateIndexState(createIndexingState(documentId, documentName));

    try {
      const contentHash = await hashDocumentContent(text);

      if (indexedHashesRef.current.get(documentId) === contentHash) {
        const statuses = await fetchDocumentIndexStatuses([documentId]);
        const existing = statuses[0];

        if (existing?.status === "ready") {
          updateIndexState(existing);
          return;
        }
      }

      const result = await indexDocumentInRag({
        documentId,
        documentName,
        text,
        pages,
        contentHash,
      });

      updateIndexState({
        documentId,
        filename: documentName,
        status: result.status,
        chunkCount: result.chunkCount,
        error: result.error,
        updatedAt: new Date().toISOString(),
      });

      if (result.status === "ready") {
        indexedHashesRef.current.set(documentId, contentHash);
      } else {
        indexedHashesRef.current.delete(documentId);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to generate embeddings for this document.";

      indexedHashesRef.current.delete(documentId);

      const [serverStatus] = await fetchDocumentIndexStatuses([documentId]);

      if (serverStatus?.status === "ready") {
        updateIndexState(serverStatus);
        indexedHashesRef.current.set(documentId, await hashDocumentContent(text));
        return;
      }

      updateIndexState({
        documentId,
        filename: documentName,
        status: "failed",
        error: serverStatus?.error ?? message,
        updatedAt: new Date().toISOString(),
      });

      console.error(`[RAG:client] Failed to index ${documentName}:`, error);
    }
  }

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
            setIndexStates((current) => {
              const next = { ...current };
              delete next[documentId];
              return next;
            });
          } catch (error) {
            console.error("Failed to delete document index:", error);
          }
        }
      }

      for (const pdf of pdfs) {
        if (cancelled) {
          return;
        }

        const contentHash = await hashDocumentContent(pdf.text);

        if (indexedHashesRef.current.get(pdf.id) === contentHash) {
          const statuses = await fetchDocumentIndexStatuses([pdf.id]);

          if (statuses[0]?.status === "ready") {
            updateIndexState(statuses[0]);
            continue;
          }
        }

        await indexDocumentEntry(
          pdf.id,
          pdf.fileName,
          pdf.text,
          pdf.pages,
        );
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
            setIndexStates((current) => {
              const next = { ...current };
              delete next[PASTED_TEXT_DOCUMENT_ID];
              return next;
            });
          } catch (error) {
            console.error("Failed to delete pasted text index:", error);
          }
        }
        return;
      }

      await indexDocumentEntry(
        PASTED_TEXT_DOCUMENT_ID,
        "Pasted Text",
        pastedText,
      );
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [pastedText]);

  useEffect(() => {
    if (documents.length === 0) {
      return;
    }

    let cancelled = false;

    async function pollStatuses() {
      const statuses = await fetchDocumentIndexStatuses(
        documents.map((document) => document.id),
      );

      if (cancelled || statuses.length === 0) {
        return;
      }

      setIndexStates((current) => mergeIndexStates(current, statuses));

      for (const status of statuses) {
        if (status.status !== "ready") {
          continue;
        }

        const document = documents.find((item) => item.id === status.documentId);

        if (!document) {
          continue;
        }

        indexedHashesRef.current.set(
          status.documentId,
          await hashDocumentContent(document.text),
        );
      }
    }

    void pollStatuses();
    const intervalId = window.setInterval(() => {
      void pollStatuses();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [documents]);

  return (
    <section className="flex flex-col gap-6">
      <ChatPanel
        hasDocuments={hasDocuments}
        documents={documents}
        indexStates={indexStates}
      />

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
