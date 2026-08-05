"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { PDFViewer, PDFViewerProvider } from "@/components/PDFViewer";
import {
  cancelDocumentFromRag,
  clearRagIndex,
  createClientIndexState,
  deleteDocumentFromRag,
  fetchDocumentIndexStatuses,
  hashDocumentContent,
  hashFileBytes,
  indexDocumentInRag,
  mergeIndexStates,
  pollIndexProgress,
} from "@/lib/rag/client";
import {
  bulkLibraryAction,
  createLibraryPdfBlobUrl,
  fetchDocumentLibrary,
  fetchLibraryDocument,
  lookupLibraryByHash,
  patchLibraryDocumentMeta,
  uploadLibraryPdf,
} from "@/lib/rag/libraryClient";
import {
  formatRetrievalScopeLabel,
  inferDocumentType,
  resolveRetrievalDocumentIds,
  type RetrievalScope,
} from "@/lib/rag/libraryMeta";
import {
  clearPdfDocumentCache,
  destroyCachedPdfDocument,
} from "@/lib/pdf/pdfDocumentCache";
import { isAnyDocumentIndexing } from "@/lib/rag/indexProgress";
import { usePDFViewer } from "@/components/PDFViewer";
import { DocumentIndexProgressCard } from "@/components/upload/DocumentIndexProgressCard";
import { ImageUploadManager } from "@/components/upload/ImageUploadManager";
import { IndexingToast } from "@/components/upload/IndexingToast";
import { PdfUploadManager } from "@/components/upload/PdfUploadManager";
import { TextPasteManager } from "@/components/upload/TextPasteManager";
import type { DocumentContextItem } from "@/types/documentContext";
import type { PdfDocument, PdfParseResult, PdfSourceRef } from "@/types/pdf";
import type { DocumentIndexState } from "@/types/rag";
import { PASTED_TEXT_DOCUMENT_ID } from "@/types/rag";

const DUPLICATE_LIBRARY_MESSAGE =
  "This document already exists in your Knowledge Library.";

function DocumentLibraryPanel({
  pdfs,
  indexStates,
  onAdd,
  onRemove,
  onRetry,
  onCancel,
  onParseCancelled,
  onToggleEnabled,
  onTagsChange,
  onBulkEnable,
  onBulkDelete,
  onBulkReindex,
}: {
  pdfs: PdfDocument[];
  indexStates: Record<string, DocumentIndexState>;
  onAdd: (result: PdfParseResult, file: File) => void | Promise<void>;
  onRemove: (id: string) => void;
  onRetry: (documentId: string) => void;
  onCancel: (documentId: string) => void;
  onParseCancelled: () => void;
  onToggleEnabled: (documentId: string, enabled: boolean) => void;
  onTagsChange: (documentId: string, tags: string[]) => void;
  onBulkEnable: (documentIds: string[], enabled: boolean) => void;
  onBulkDelete: (documentIds: string[]) => void;
  onBulkReindex: (documentIds: string[]) => void;
}) {
  const { openDocument } = usePDFViewer();

  return (
    <PdfUploadManager
      pdfs={pdfs}
      indexStates={indexStates}
      onAdd={onAdd}
      onRemove={onRemove}
      onOpen={(id) => openDocument(id)}
      onRetry={onRetry}
      onCancel={onCancel}
      onParseCancelled={onParseCancelled}
      onToggleEnabled={onToggleEnabled}
      onTagsChange={onTagsChange}
      onBulkEnable={onBulkEnable}
      onBulkDelete={onBulkDelete}
      onBulkReindex={onBulkReindex}
    />
  );
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const indexedHashesRef = useRef<Map<string, string>>(new Map());
  const indexingInFlightRef = useRef<Set<string>>(new Set());
  const previousIndexStatesRef = useRef<Record<string, DocumentIndexState>>({});
  const indexAbortControllersRef = useRef<Map<string, AbortController>>(
    new Map(),
  );
  const cancelledDocumentIdsRef = useRef<Set<string>>(new Set());
  const cancelledPastedTextHashRef = useRef<string | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const skipAutoIndexIdsRef = useRef<Set<string>>(new Set());
  const [retrievalScope, setRetrievalScope] = useState<RetrievalScope>({
    mode: "all-enabled",
    currentDocumentId: null,
    selectedDocumentIds: [],
  });

  function updateIndexState(state: DocumentIndexState) {
    setIndexStates((current) => ({
      ...current,
      [state.documentId]: state,
    }));
  }

  async function handlePdfAdd(result: PdfParseResult, file: File) {
    const blobUrl = result.blobUrl;
    if (!blobUrl) {
      console.error("PDF upload is missing blobUrl; viewer will be unavailable.");
      return;
    }

    const fileHash = await hashFileBytes(file);
    const textHash = await hashDocumentContent(result.text);

    // Prefer file SHA-256; fall back to text hash for legacy indexes.
    const fileMatch = await lookupLibraryByHash(fileHash);
    const textMatch = fileMatch.found
      ? fileMatch
      : await lookupLibraryByHash(textHash);
    const existing = fileMatch.found ? fileMatch : textMatch;
    const contentHash = existing.found
      ? (existing.contentHash ?? fileHash)
      : fileHash;

    // Filename + size duplicate protection (same file re-uploaded).
    const nameSizeMatch = pdfs.find(
      (pdf) =>
        pdf.fileName === result.fileName && pdf.fileSize === result.fileSize,
    );

    if (
      nameSizeMatch &&
      (!existing.found || existing.documentId === nameSizeMatch.id)
    ) {
      URL.revokeObjectURL(blobUrl);
      setToastMessage(DUPLICATE_LIBRARY_MESSAGE);
      return;
    }

    if (existing.found && existing.documentId && existing.status === "ready") {
      if (pdfs.some((pdf) => pdf.id === existing.documentId)) {
        URL.revokeObjectURL(blobUrl);
        setToastMessage(DUPLICATE_LIBRARY_MESSAGE);
        return;
      }

      const detail = await fetchLibraryDocument(existing.documentId);
      const persistedBlobUrl =
        (await createLibraryPdfBlobUrl(existing.documentId)) ?? blobUrl;

      if (persistedBlobUrl !== blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      skipAutoIndexIdsRef.current.add(existing.documentId);
      indexedHashesRef.current.set(existing.documentId, contentHash);

      setPdfs((current) => [
        ...current,
        {
          id: existing.documentId!,
          fileName: detail?.filename ?? existing.filename ?? result.fileName,
          fileSize: detail?.fileSize ?? existing.fileSize ?? result.fileSize,
          totalPages:
            detail?.totalPages ?? existing.totalPages ?? result.totalPages,
          text: detail?.text ?? result.text,
          pages: detail?.pages ?? result.pages,
          blobUrl: persistedBlobUrl,
          contentHash,
          indexedAt: detail?.indexedAt ?? existing.indexedAt,
          enabled: true,
          tags: [],
          documentType: inferDocumentType(
            detail?.filename ?? existing.filename ?? result.fileName,
          ),
          chunkCount: existing.chunkCount,
        },
      ]);

      updateIndexState({
        documentId: existing.documentId,
        filename: existing.filename ?? result.fileName,
        status: "ready",
        stage: "ready",
        chunkCount: existing.chunkCount,
        totalChunks: existing.chunkCount,
        progressPercent: 100,
        updatedAt: new Date().toISOString(),
      });

      setToastMessage(DUPLICATE_LIBRARY_MESSAGE);
      return;
    }

    const documentId = crypto.randomUUID();

    setPdfs((current) => [
      ...current,
      {
        ...result,
        blobUrl,
        id: documentId,
        contentHash,
        enabled: true,
        tags: [],
        documentType: inferDocumentType(result.fileName),
      },
    ]);

    try {
      await uploadLibraryPdf(documentId, file);
    } catch (error) {
      console.error("Failed to persist PDF bytes:", error);
    }
  }

  function handlePdfRemove(id: string) {
    setPdfs((current) => {
      const target = current.find((pdf) => pdf.id === id);
      if (target?.blobUrl) {
        URL.revokeObjectURL(target.blobUrl);
      }
      void destroyCachedPdfDocument(id);
      return current.filter((pdf) => pdf.id !== id);
    });
  }

  async function handleClearAll() {
    for (const pdf of pdfs) {
      if (pdf.blobUrl) {
        URL.revokeObjectURL(pdf.blobUrl);
      }
    }
    void clearPdfDocumentCache();

    setPdfs([]);
    setHasImages(false);
    setHasText(false);
    setPastedText("");
    setIndexStates({});
    setToastMessage(null);
    setResetKey((key) => key + 1);

    try {
      await clearRagIndex();
      indexedHashesRef.current.clear();
      indexingInFlightRef.current.clear();
    } catch (error) {
      console.error("Failed to clear document index:", error);
    }
  }

  const hasDocuments = pdfs.length > 0 || hasImages || hasText;

  const pdfSources = useMemo((): PdfSourceRef[] => {
    return pdfs.map((pdf) => ({
      documentId: pdf.id,
      fileName: pdf.fileName,
      blobUrl: pdf.blobUrl,
      totalPages: pdf.totalPages,
    }));
  }, [pdfs]);

  const documents = useMemo((): DocumentContextItem[] => {
    const items: DocumentContextItem[] = pdfs.map((pdf) => ({
      id: pdf.id,
      name: pdf.fileName,
      text: pdf.text,
      totalPages: pdf.totalPages,
      fileSize: pdf.fileSize,
      enabled: pdf.enabled !== false,
    }));

    if (pastedText.trim()) {
      items.push({
        id: PASTED_TEXT_DOCUMENT_ID,
        name: "Pasted Text",
        text: pastedText,
        enabled: true,
      });
    }

    return items;
  }, [pdfs, pastedText]);

  const textDocumentIds = useMemo(
    () =>
      documents
        .filter((document) => document.text.trim().length > 0)
        .map((document) => document.id),
    [documents],
  );

  const retrievalDocumentIds = useMemo(
    () =>
      resolveRetrievalDocumentIds(
        documents.map((document) => ({
          id: document.id,
          enabled: document.enabled,
        })),
        retrievalScope,
      ),
    [documents, retrievalScope],
  );

  const isIndexing = isAnyDocumentIndexing(indexStates, textDocumentIds);
  const isRetrievalScopeIndexing = isAnyDocumentIndexing(
    indexStates,
    retrievalDocumentIds.length > 0 ? retrievalDocumentIds : textDocumentIds,
  );

  // Keep current-document scope pointed at a valid enabled PDF.
  useEffect(() => {
    const enabledIds = pdfs
      .filter((pdf) => pdf.enabled !== false)
      .map((pdf) => pdf.id);

    setRetrievalScope((current) => {
      const nextCurrent =
        current.currentDocumentId &&
        enabledIds.includes(current.currentDocumentId)
          ? current.currentDocumentId
          : (enabledIds[0] ?? null);

      const nextSelected = (current.selectedDocumentIds ?? []).filter((id) =>
        enabledIds.includes(id),
      );

      if (
        nextCurrent === current.currentDocumentId &&
        nextSelected.length === (current.selectedDocumentIds ?? []).length
      ) {
        return current;
      }

      return {
        ...current,
        currentDocumentId: nextCurrent,
        selectedDocumentIds:
          nextSelected.length > 0 ? nextSelected : enabledIds,
      };
    });
  }, [pdfs]);

  const indexDocumentEntry = useCallback(
    async (
      documentId: string,
      documentName: string,
      text: string,
      pages?: PdfParseResult["pages"],
      options?: {
        contentHash?: string;
        fileSize?: number;
        totalPages?: number;
      },
    ) => {
      if (indexingInFlightRef.current.has(documentId)) {
        return;
      }

      if (skipAutoIndexIdsRef.current.has(documentId)) {
        skipAutoIndexIdsRef.current.delete(documentId);
        return;
      }

      indexingInFlightRef.current.add(documentId);
      const pollController = new AbortController();
      const fetchController = new AbortController();
      indexAbortControllersRef.current.set(documentId, fetchController);

      updateIndexState(
        createClientIndexState(documentId, documentName, "uploading"),
      );

      const pollPromise = pollIndexProgress(
        documentId,
        updateIndexState,
        pollController.signal,
      );

      try {
        const contentHash =
          options?.contentHash ?? (await hashDocumentContent(text));

        if (indexedHashesRef.current.get(documentId) === contentHash) {
          const statuses = await fetchDocumentIndexStatuses([documentId]);
          const existing = statuses[0];

          if (existing?.status === "ready") {
            updateIndexState(existing);
            return;
          }
        }

        if (cancelledDocumentIdsRef.current.has(documentId)) {
          return;
        }

        const result = await indexDocumentInRag(
          {
            documentId,
            documentName,
            text,
            pages,
            contentHash,
            fileSize: options?.fileSize,
            totalPages: options?.totalPages,
          },
          fetchController.signal,
        );

        if (cancelledDocumentIdsRef.current.has(documentId)) {
          return;
        }

        // Server may reuse an existing documentId for identical content.
        const resolvedId = result.documentId;

        if (resolvedId !== documentId) {
          setPdfs((current) =>
            current.map((pdf) =>
              pdf.id === documentId
                ? {
                    ...pdf,
                    id: resolvedId,
                    contentHash,
                    indexedAt: new Date().toISOString(),
                  }
                : pdf,
            ),
          );
          setIndexStates((current) => {
            const next = { ...current };
            delete next[documentId];
            return next;
          });
          indexedHashesRef.current.delete(documentId);
        }

        updateIndexState({
          documentId: resolvedId,
          filename: documentName,
          status: result.status,
          stage: result.status === "ready" ? "ready" : "failed",
          chunkCount: result.chunkCount,
          totalChunks: result.chunkCount,
          embeddedChunks: result.chunkCount,
          progressPercent: result.status === "ready" ? 100 : 0,
          error: result.error,
          updatedAt: new Date().toISOString(),
        });

        if (result.status === "ready") {
          indexedHashesRef.current.set(resolvedId, contentHash);
          setPdfs((current) =>
            current.map((pdf) =>
              pdf.id === resolvedId
                ? { ...pdf, contentHash, indexedAt: new Date().toISOString() }
                : pdf,
            ),
          );

          if (result.skipped || result.reusedExisting) {
            setToastMessage(DUPLICATE_LIBRARY_MESSAGE);
          }
        } else {
          indexedHashesRef.current.delete(resolvedId);
        }
      } catch (error) {
        if (cancelledDocumentIdsRef.current.has(documentId)) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to generate embeddings for this document.";

        if (message === "Document indexing cancelled.") {
          return;
        }

        if (message.toLowerCase().includes("local document storage")) {
          setToastMessage(message);
        }

        indexedHashesRef.current.delete(documentId);

        const [serverStatus] = await fetchDocumentIndexStatuses([documentId]);

        if (serverStatus?.status === "ready") {
          updateIndexState(serverStatus);
          indexedHashesRef.current.set(
            documentId,
            await hashDocumentContent(text),
          );
          return;
        }

        updateIndexState({
          documentId,
          filename: documentName,
          status: "failed",
          stage: "failed",
          progressPercent: 0,
          error: serverStatus?.error ?? message,
          updatedAt: new Date().toISOString(),
        });

        console.error(`[RAG:client] Failed to index ${documentName}:`, error);
      } finally {
        pollController.abort();
        await pollPromise;
        indexAbortControllersRef.current.delete(documentId);
        cancelledDocumentIdsRef.current.delete(documentId);
        indexingInFlightRef.current.delete(documentId);
      }
    },
    [],
  );

  const retryDocument = useCallback(
    (documentId: string) => {
      indexedHashesRef.current.delete(documentId);
      cancelledDocumentIdsRef.current.delete(documentId);

      if (documentId === PASTED_TEXT_DOCUMENT_ID) {
        cancelledPastedTextHashRef.current = null;
      }

      const pdf = pdfs.find((item) => item.id === documentId);

      if (pdf) {
        skipAutoIndexIdsRef.current.delete(pdf.id);
        void indexDocumentEntry(pdf.id, pdf.fileName, pdf.text, pdf.pages, {
          contentHash: pdf.contentHash,
          fileSize: pdf.fileSize,
          totalPages: pdf.totalPages,
        });
        return;
      }

      if (documentId === PASTED_TEXT_DOCUMENT_ID && pastedText.trim()) {
        void indexDocumentEntry(
          PASTED_TEXT_DOCUMENT_ID,
          "Pasted Text",
          pastedText,
        );
      }
    },
    [indexDocumentEntry, pdfs, pastedText],
  );

  const cancelDocument = useCallback(
    async (documentId: string) => {
      cancelledDocumentIdsRef.current.add(documentId);

      indexAbortControllersRef.current.get(documentId)?.abort();
      indexAbortControllersRef.current.delete(documentId);
      indexingInFlightRef.current.delete(documentId);
      indexedHashesRef.current.delete(documentId);

      setIndexStates((current) => {
        const next = { ...current };
        delete next[documentId];
        return next;
      });

      if (documentId === PASTED_TEXT_DOCUMENT_ID) {
        cancelledPastedTextHashRef.current = await hashDocumentContent(
          pastedText,
        );
      } else {
        setPdfs((current) => {
          const target = current.find((pdf) => pdf.id === documentId);
          if (target?.blobUrl) {
            URL.revokeObjectURL(target.blobUrl);
          }
          void destroyCachedPdfDocument(documentId);
          return current.filter((pdf) => pdf.id !== documentId);
        });
      }

      try {
        await cancelDocumentFromRag(documentId);
      } catch (error) {
        console.error("Failed to cancel document indexing:", error);
      }

      setToastMessage("Document indexing cancelled.");
    },
    [pastedText],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateLibrary() {
      try {
        const documents = await fetchDocumentLibrary();
        if (cancelled) {
          return;
        }

        if (documents.length === 0) {
          setLibraryReady(true);
          return;
        }

        const hydrated: PdfDocument[] = [];
        const nextStates: Record<string, DocumentIndexState> = {};

        for (const document of documents) {
          if (document.documentId === PASTED_TEXT_DOCUMENT_ID) {
            continue;
          }

          const detail = await fetchLibraryDocument(document.documentId);
          const blobUrl = await createLibraryPdfBlobUrl(document.documentId);

          skipAutoIndexIdsRef.current.add(document.documentId);
          indexedHashesRef.current.set(
            document.documentId,
            document.contentHash,
          );

          hydrated.push({
            id: document.documentId,
            fileName: document.filename,
            fileSize: document.fileSize,
            totalPages: document.totalPages,
            text:
              detail?.text ||
              (document.status === "ready"
                ? "[Indexed document — content available via retrieval]"
                : ""),
            pages: detail?.pages ?? [],
            blobUrl:
              blobUrl ??
              URL.createObjectURL(new Blob([], { type: "application/pdf" })),
            contentHash: document.contentHash,
            indexedAt: document.indexedAt,
            enabled: document.enabled !== false,
            tags: document.tags ?? [],
            lastUsedAt: document.lastUsedAt,
            documentType:
              document.documentType ?? inferDocumentType(document.filename),
            embeddingModel: document.embeddingModel,
            knowledgeBaseVersion: document.knowledgeBaseVersion,
            chunkCount: document.chunkCount,
            requiresReindex: document.requiresReindex,
          });

          nextStates[document.documentId] = {
            documentId: document.documentId,
            filename: document.filename,
            status: document.status,
            stage:
              document.stage ??
              (document.status === "ready" ? "ready" : undefined),
            chunkCount: document.chunkCount,
            totalChunks: document.chunkCount,
            progressPercent: document.status === "ready" ? 100 : 0,
            error: document.error,
            updatedAt: document.indexedAt || new Date().toISOString(),
          };
        }

        if (cancelled) {
          return;
        }

        if (hydrated.length > 0) {
          setPdfs((current) => {
            const existingIds = new Set(current.map((pdf) => pdf.id));
            const mergedLibrary = hydrated.filter(
              (pdf) => !existingIds.has(pdf.id),
            );
            return [...mergedLibrary, ...current];
          });
          setIndexStates((current) => ({ ...nextStates, ...current }));
        }
      } catch (error) {
        console.error("Failed to hydrate document library:", error);
      } finally {
        if (!cancelled) {
          setLibraryReady(true);
        }
      }
    }

    void hydrateLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncPdfIndexes() {
      if (!libraryReady) {
        return;
      }

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

        const contentHash =
          pdf.contentHash ?? (await hashDocumentContent(pdf.text));

        if (indexedHashesRef.current.get(pdf.id) === contentHash) {
          const statuses = await fetchDocumentIndexStatuses([pdf.id]);

          if (statuses[0]?.status === "ready") {
            updateIndexState(statuses[0]);
            continue;
          }
        }

        if (indexingInFlightRef.current.has(pdf.id)) {
          continue;
        }

        await indexDocumentEntry(pdf.id, pdf.fileName, pdf.text, pdf.pages, {
          contentHash: pdf.contentHash,
          fileSize: pdf.fileSize,
          totalPages: pdf.totalPages,
        });
      }
    }

    void syncPdfIndexes();

    return () => {
      cancelled = true;
    };
  }, [pdfs, indexDocumentEntry, libraryReady]);

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
        cancelledPastedTextHashRef.current = null;
        return;
      }

      const contentHash = await hashDocumentContent(pastedText);

      if (cancelledPastedTextHashRef.current === contentHash) {
        return;
      }

      if (indexingInFlightRef.current.has(PASTED_TEXT_DOCUMENT_ID)) {
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
  }, [pastedText, indexDocumentEntry]);

  useEffect(() => {
    if (textDocumentIds.length === 0) {
      return;
    }

    let cancelled = false;
    const pollInterval = isIndexing ? 500 : 2000;

    async function pollStatuses() {
      const statuses = await fetchDocumentIndexStatuses(textDocumentIds);

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
    }, pollInterval);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [documents, textDocumentIds, isIndexing]);

  useEffect(() => {
    for (const [documentId, state] of Object.entries(indexStates)) {
      const previous = previousIndexStatesRef.current[documentId];

      if (previous?.status === "indexing" && state.status === "ready") {
        setToastMessage(
          `✅ ${state.filename} indexed successfully. Ready for AI search.`,
        );
        setPdfs((current) =>
          current.map((pdf) =>
            pdf.id === documentId
              ? {
                  ...pdf,
                  indexedAt: state.updatedAt,
                  chunkCount: state.chunkCount ?? pdf.chunkCount,
                  requiresReindex: false,
                }
              : pdf,
          ),
        );
      }
    }

    previousIndexStatesRef.current = indexStates;
  }, [indexStates]);

  const handleToggleEnabled = useCallback(
    (documentId: string, enabled: boolean) => {
      setPdfs((current) =>
        current.map((pdf) =>
          pdf.id === documentId ? { ...pdf, enabled } : pdf,
        ),
      );

      void patchLibraryDocumentMeta(documentId, { enabled }).catch((error) => {
        console.error("Failed to update document enabled state:", error);
        setToastMessage(
          error instanceof Error
            ? error.message
            : "Unable to update document settings.",
        );
      });
    },
    [],
  );

  const handleTagsChange = useCallback((documentId: string, tags: string[]) => {
    setPdfs((current) =>
      current.map((pdf) => (pdf.id === documentId ? { ...pdf, tags } : pdf)),
    );

    void patchLibraryDocumentMeta(documentId, { tags }).catch((error) => {
      console.error("Failed to update document tags:", error);
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Unable to update document tags.",
      );
    });
  }, []);

  const handleBulkEnable = useCallback(
    (documentIds: string[], enabled: boolean) => {
      if (documentIds.length === 0) {
        return;
      }

      const idSet = new Set(documentIds);
      setPdfs((current) =>
        current.map((pdf) =>
          idSet.has(pdf.id) ? { ...pdf, enabled } : pdf,
        ),
      );

      void bulkLibraryAction(enabled ? "enable" : "disable", documentIds).catch(
        (error) => {
          console.error("Failed bulk enable/disable:", error);
          setToastMessage(
            error instanceof Error
              ? error.message
              : "Unable to complete bulk action.",
          );
        },
      );
    },
    [],
  );

  const handleBulkDelete = useCallback((documentIds: string[]) => {
    if (documentIds.length === 0) {
      return;
    }

    const idSet = new Set(documentIds);

    setPdfs((current) => {
      for (const pdf of current) {
        if (idSet.has(pdf.id) && pdf.blobUrl) {
          URL.revokeObjectURL(pdf.blobUrl);
          void destroyCachedPdfDocument(pdf.id);
        }
      }
      return current.filter((pdf) => !idSet.has(pdf.id));
    });

    for (const documentId of documentIds) {
      indexedHashesRef.current.delete(documentId);
      indexingInFlightRef.current.delete(documentId);
    }

    setIndexStates((current) => {
      const next = { ...current };
      for (const documentId of documentIds) {
        delete next[documentId];
      }
      return next;
    });

    void bulkLibraryAction("delete", documentIds).catch((error) => {
      console.error("Failed bulk delete:", error);
      setToastMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete selected documents.",
      );
    });
  }, []);

  const handleBulkReindex = useCallback(
    (documentIds: string[]) => {
      for (const documentId of documentIds) {
        retryDocument(documentId);
      }
    },
    [retryDocument],
  );

  return (
    <PDFViewerProvider sources={pdfSources}>
      <section className="flex flex-col gap-6">
        <ChatPanel
          hasDocuments={hasDocuments}
          documents={documents}
          indexStates={indexStates}
          indexingInProgress={isRetrievalScopeIndexing}
          retrievalScope={retrievalScope}
          onRetrievalScopeChange={setRetrievalScope}
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
                Knowledge Library
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Multi-document standards library ·{" "}
                {formatRetrievalScopeLabel(
                  documents.map((document) => ({
                    id: document.id,
                    name: document.name,
                    enabled: document.enabled,
                  })),
                  retrievalScope,
                )}
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
            <DocumentLibraryPanel
              key={`pdf-${resetKey}`}
              pdfs={pdfs}
              indexStates={indexStates}
              onAdd={handlePdfAdd}
              onRemove={handlePdfRemove}
              onRetry={retryDocument}
              onCancel={(documentId) => void cancelDocument(documentId)}
              onParseCancelled={() =>
                setToastMessage("Document indexing cancelled.")
              }
              onToggleEnabled={handleToggleEnabled}
              onTagsChange={handleTagsChange}
              onBulkEnable={handleBulkEnable}
              onBulkDelete={handleBulkDelete}
              onBulkReindex={handleBulkReindex}
            />
            <ImageUploadManager
              key={`images-${resetKey}`}
              onHasContentChange={setHasImages}
            />
            <div className="space-y-3">
              <TextPasteManager
                key={`text-${resetKey}`}
                onHasContentChange={setHasText}
                onTextChange={setPastedText}
              />
              {pastedText.trim() && indexStates[PASTED_TEXT_DOCUMENT_ID] && (
                <DocumentIndexProgressCard
                  filename="Pasted Text"
                  state={indexStates[PASTED_TEXT_DOCUMENT_ID]}
                  onRetry={() => retryDocument(PASTED_TEXT_DOCUMENT_ID)}
                  onCancel={
                    indexStates[PASTED_TEXT_DOCUMENT_ID]?.status === "indexing"
                      ? () => void cancelDocument(PASTED_TEXT_DOCUMENT_ID)
                      : undefined
                  }
                  compact
                />
              )}
            </div>
          </div>
        </section>

        <IndexingToast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />

        <PDFViewer />
      </section>
    </PDFViewerProvider>
  );
}
