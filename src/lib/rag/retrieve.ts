import { chunkDocument } from "@/lib/rag/chunk";
import {
  embedTextsInBatches,
  formatEmbeddingError,
} from "@/lib/rag/embed";
import { clearEmbeddingCache } from "@/lib/rag/embeddingCache";
import { hybridRetrieve, type HybridRetrievalResult } from "@/lib/rag/hybridSearch";
import {
  assertNotCancelled,
  cancelIndexOperation,
  IndexCancelledError,
  isCancellationError,
} from "@/lib/rag/indexCancellation";
import { getIndexStatusStore } from "@/lib/rag/indexStatus";
import {
  clearLibraryDocuments,
  deleteLibraryDocument,
  getLibraryDocument,
  libraryHasPdf,
  listLibraryDocumentIds,
  saveLibraryExtracted,
} from "@/lib/rag/libraryStore";
import {
  KNOWLEDGE_BASE_VERSION,
  documentNeedsReindex,
  inferDocumentType,
} from "@/lib/rag/libraryMeta";
import { ragDebug, ragError, ragLog } from "@/lib/rag/logger";
import { getVectorStore, StorageWriteError } from "@/lib/rag/store";
import type {
  DocumentIndexState,
  IndexDocumentRequest,
  IndexDocumentResult,
  LibraryDocumentSummary,
  RetrievedChunk,
  StoredDocumentChunk,
} from "@/lib/rag/types";
import { TOP_K_CHUNKS } from "@/lib/rag/types";

export class RetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetrievalError";
  }
}

const INDEXING_STALE_MS = 10 * 60 * 1000;

function resolveDocumentText(request: IndexDocumentRequest): {
  text: string;
  extractedPageCount: number;
  characterCount: number;
} {
  const extractedPageCount = request.pages?.length ?? 0;

  // When pages are present, chunkDocument processes them one page at a time.
  // Do not join every page into one enormous string just for logging/fallback.
  if (request.pages?.length) {
    let characterCount = 0;

    for (const page of request.pages) {
      characterCount += page.text.length;
    }

    return {
      text: request.text.trim(),
      extractedPageCount,
      characterCount,
    };
  }

  const text = request.text.trim();

  return {
    text,
    extractedPageCount,
    characterCount: text.length,
  };
}

function isDebugDocument(documentName: string): boolean {
  return /AS3000/i.test(documentName);
}

async function reconcileDocumentStatus(
  documentId: string,
): Promise<DocumentIndexState | undefined> {
  const statusStore = getIndexStatusStore();
  const vectorStore = getVectorStore();
  let status = await statusStore.getStatus(documentId);
  const record = await vectorStore.getDocumentRecord(documentId);
  const storedChunkCount = await vectorStore.getStoredChunkCount(documentId);

  if (record && storedChunkCount > 0) {
    if (!status || status.status !== "ready") {
      status = await statusStore.setStatus(documentId, record.filename, "ready", {
        chunkCount: storedChunkCount,
        stage: "ready",
        totalChunks: storedChunkCount,
        embeddedChunks: storedChunkCount,
      });
      ragLog(
        "ready",
        `Recovered ready status from stored vectors for ${record.filename} (${storedChunkCount} chunks).`,
      );
    }

    return status;
  }

  if (status?.status === "indexing") {
    const ageMs = Date.now() - new Date(status.updatedAt).getTime();

    if (ageMs > INDEXING_STALE_MS) {
      const error =
        "Indexing timed out before completion. Remove the document and upload again.";

      status = await statusStore.setStatus(documentId, status.filename, "failed", {
        error,
      });
      ragError("failed", `Marked stale indexing as failed for ${status.filename}.`);
    }
  }

  return status;
}

export async function getDocumentIndexStatuses(
  documentIds: string[],
): Promise<DocumentIndexState[]> {
  const statuses: DocumentIndexState[] = [];

  for (const documentId of documentIds) {
    const status = await reconcileDocumentStatus(documentId);

    if (status) {
      statuses.push(status);
    }
  }

  return statuses;
}

export async function indexDocument(
  request: IndexDocumentRequest,
  signal?: AbortSignal,
): Promise<IndexDocumentResult> {
  const vectorStore = getVectorStore();
  const statusStore = getIndexStatusStore();
  const { documentId, documentName, contentHash } = request;
  const { text, extractedPageCount, characterCount } =
    resolveDocumentText(request);
  const debugDocument = isDebugDocument(documentName);

  ragLog("upload", `Uploading document: ${documentName} (${documentId})`);
  ragLog(
    "extract",
    `Extracting text for ${documentName}: ${extractedPageCount} pages, ${characterCount.toLocaleString()} characters.`,
  );

  if (debugDocument) {
    ragDebug("AS3000 upload stats", {
      extractedPages: extractedPageCount,
      characterCount,
    });
  }

  const existingById = await vectorStore.getDocumentRecord(documentId);
  const existingByHash =
    await vectorStore.findDocumentByContentHash(contentHash);
  const reusable =
    existingById?.contentHash === contentHash
      ? existingById
      : existingByHash;

  if (reusable) {
    try {
      const storedChunkCount = await vectorStore.getStoredChunkCount(
        reusable.documentId,
      );
      await vectorStore.verifyDocumentStorage(
        reusable.documentId,
        storedChunkCount,
      );

      await statusStore.setStatus(
        reusable.documentId,
        reusable.filename || documentName,
        "ready",
        {
          chunkCount: storedChunkCount,
          stage: "ready",
          totalChunks: storedChunkCount,
        },
      );

      const existingLibrary = await getLibraryDocument(reusable.documentId);
      const reusePages =
        request.pages?.length ? request.pages : (existingLibrary?.pages ?? []);
      const reuseText =
        text ||
        existingLibrary?.text ||
        reusePages
          .map((page) => page.text)
          .filter(Boolean)
          .join("\n\n");

      await saveLibraryExtracted({
        documentId: reusable.documentId,
        filename: reusable.filename || documentName,
        contentHash,
        fileSize: request.fileSize ?? reusable.fileSize ?? 0,
        totalPages:
          request.totalPages ?? reusable.totalPages ?? extractedPageCount,
        indexedAt: reusable.indexedAt ?? new Date().toISOString(),
        text: reuseText,
        pages: reusePages,
      });

      await vectorStore.updateDocumentRecord(reusable.documentId, {
        fileSize: request.fileSize ?? reusable.fileSize,
        totalPages:
          request.totalPages ?? reusable.totalPages ?? extractedPageCount,
        hasPdf: await libraryHasPdf(reusable.documentId),
      });

      ragLog(
        "ready",
        `Reusing existing index for ${documentName}: ${reusable.documentId} (${storedChunkCount} chunks, no re-embed).`,
      );

      return {
        documentId: reusable.documentId,
        chunkCount: storedChunkCount,
        skipped: true,
        reusedExisting: reusable.documentId !== documentId,
        status: "ready",
      };
    } catch {
      ragLog(
        "store",
        `Existing index for hash ${contentHash.slice(0, 8)}… failed verification; re-indexing.`,
      );
    }
  }

  await statusStore.setStatus(documentId, documentName, "indexing", {
    stage: "extracting",
  });

  try {
    assertNotCancelled(signal);
    await statusStore.updateProgress(documentId, { stage: "chunking" });
    ragLog("chunk", `Chunking document: ${documentName}`);

    const chunks = chunkDocument({
      documentId,
      documentName,
      text,
      pages: request.pages,
    });

    ragLog(
      "chunk",
      `Chunking complete for ${documentName}: ${chunks.length} chunks generated.`,
    );

    if (debugDocument) {
      ragDebug("AS3000 chunk stats", {
        extractedPages: extractedPageCount,
        chunkCount: chunks.length,
      });
    }

    if (chunks.length === 0) {
      await vectorStore.deleteDocument(documentId);
      const error =
        "No extractable text found in this document. Upload a text-based PDF or paste the content directly.";

      await statusStore.setStatus(documentId, documentName, "failed", {
        error,
        stage: "failed",
      });
      ragError("failed", `Indexing failed for ${documentName}: ${error}`);

      return {
        documentId,
        chunkCount: 0,
        skipped: false,
        status: "failed",
        error,
      };
    }

    assertNotCancelled(signal);

    await statusStore.updateProgress(documentId, {
      stage: "embedding",
      embeddedChunks: 0,
      totalChunks: chunks.length,
    });

    ragLog(
      "embed",
      `Generating embeddings for ${documentName}: ${chunks.length} chunks.`,
    );

    let lastProgressWrite = 0;

    const embeddings = await embedTextsInBatches(
      chunks.map((chunk) => chunk.text),
      (completed, total) => {
        ragLog(
          "embed",
          `Generating embeddings: chunk ${completed}/${total} for ${documentName}`,
        );

        const now = Date.now();

        if (
          completed === total ||
          completed % 5 === 0 ||
          now - lastProgressWrite >= 500
        ) {
          lastProgressWrite = now;
          void statusStore.updateProgress(documentId, {
            stage: "embedding",
            embeddedChunks: completed,
            totalChunks: total,
          });
        }
      },
      signal,
    );

    assertNotCancelled(signal);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: expected ${chunks.length}, received ${embeddings.length}.`,
      );
    }

    if (debugDocument) {
      ragDebug("AS3000 embedding stats", {
        chunkCount: chunks.length,
        embeddingCount: embeddings.length,
      });
    }

    const storedChunks: StoredDocumentChunk[] = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    }));

    await statusStore.updateProgress(documentId, {
      stage: "saving",
      embeddedChunks: chunks.length,
      totalChunks: chunks.length,
    });

    assertNotCancelled(signal);

    ragLog(
      "store",
      `Saving embeddings for ${documentName}: ${storedChunks.length} chunks.`,
    );

    const indexedAt = new Date().toISOString();
    const hasPdf = await libraryHasPdf(documentId);
    const pages = request.pages ?? [];
    // Persist page text for session restore; avoid requiring a second full-doc join at index time.
    const persistedText =
      text ||
      pages
        .map((page) => page.text)
        .filter(Boolean)
        .join("\n\n");

    await vectorStore.insertChunks(
      documentId,
      documentName,
      contentHash,
      storedChunks,
      {
        fileSize: request.fileSize,
        totalPages: request.totalPages ?? extractedPageCount,
        indexedAt,
        hasPdf,
      },
      signal,
    );

    await saveLibraryExtracted({
      documentId,
      filename: documentName,
      contentHash,
      fileSize: request.fileSize ?? 0,
      totalPages: request.totalPages ?? extractedPageCount,
      indexedAt,
      text: persistedText,
      pages,
    });

    await vectorStore.verifyDocumentStorage(documentId, storedChunks.length);

    await statusStore.setStatus(documentId, documentName, "ready", {
      chunkCount: storedChunks.length,
      stage: "ready",
      totalChunks: storedChunks.length,
      embeddedChunks: storedChunks.length,
    });

    ragLog(
      "ready",
      `Marking document READY: ${documentName} (${storedChunks.length} chunks stored).`,
    );

    return {
      documentId,
      chunkCount: storedChunks.length,
      skipped: false,
      status: "ready",
    };
  } catch (error) {
    if (isCancellationError(error) || signal?.aborted) {
      ragLog("cancel", `Indexing cancelled for ${documentName} (${documentId}).`);
      await vectorStore.deleteDocument(documentId);
      await statusStore.removeStatus(documentId);
      await deleteLibraryDocument(documentId);
      throw new IndexCancelledError();
    }

    // Keep any previous successful index intact on failure (no half-written replace).
    if (error instanceof StorageWriteError) {
      ragError("failed", `Storage update failed for ${documentName}: ${error.message}`, error);

      await statusStore.setStatus(documentId, documentName, "failed", {
        error: error.message,
        stage: "failed",
      });

      throw new RetrievalError(error.message);
    }

    const message = formatEmbeddingError(error);

    ragError("failed", `Indexing failed for ${documentName}: ${message}`, error);

    // Do not deleteDocument here — a failed re-index must keep the previous vectors.
    await statusStore.setStatus(documentId, documentName, "failed", {
      error: message,
      stage: "failed",
    });

    throw new RetrievalError(message);
  }
}

export async function cancelIndexedDocument(documentId: string): Promise<void> {
  // Always cancel in-flight indexing before mutating storage.
  cancelIndexOperation(documentId);
  await getVectorStore().deleteDocument(documentId);
  await getIndexStatusStore().removeStatus(documentId);
  await deleteLibraryDocument(documentId);
  ragLog("cancel", `Removed cancelled document from index: ${documentId}.`);
}

export async function deleteIndexedDocument(documentId: string): Promise<void> {
  // Deleting while indexing must cancel first so both never write concurrently.
  cancelIndexOperation(documentId);
  await getVectorStore().deleteDocument(documentId);
  await getIndexStatusStore().removeStatus(documentId);
  await deleteLibraryDocument(documentId);
}

export async function rebuildVectorIndex(): Promise<void> {
  await getVectorStore().rebuild();
  await getIndexStatusStore().clearAll();
  await clearLibraryDocuments();
  clearEmbeddingCache();
}

export async function listLibraryDocuments(): Promise<LibraryDocumentSummary[]> {
  const vectorStore = getVectorStore();
  const statusStore = getIndexStatusStore();
  const records = await vectorStore.listDocumentRecords();
  const libraryIds = new Set(await listLibraryDocumentIds());
  const summaries: LibraryDocumentSummary[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    seen.add(record.documentId);
    const status = await reconcileDocumentStatus(record.documentId);
    const libraryDoc = await getLibraryDocument(record.documentId);
    const hasPdf =
      record.hasPdf ?? libraryDoc?.hasPdf ?? (await libraryHasPdf(record.documentId));

    const embeddingModel = record.embeddingModel;
    const requiresReindex = documentNeedsReindex(embeddingModel);

    summaries.push({
      documentId: record.documentId,
      filename: record.filename,
      contentHash: record.contentHash,
      fileSize: record.fileSize ?? libraryDoc?.fileSize ?? 0,
      totalPages: record.totalPages ?? libraryDoc?.totalPages ?? 0,
      indexedAt:
        record.indexedAt ?? libraryDoc?.indexedAt ?? status?.updatedAt ?? "",
      hasPdf,
      status: status?.status ?? "failed",
      chunkCount: status?.chunkCount ?? record.chunkIds.length,
      error: status?.error,
      stage: status?.stage,
      enabled: record.enabled ?? true,
      tags: record.tags ?? [],
      lastUsedAt: record.lastUsedAt,
      documentType: record.documentType ?? inferDocumentType(record.filename),
      embeddingModel,
      knowledgeBaseVersion:
        record.knowledgeBaseVersion ?? KNOWLEDGE_BASE_VERSION,
      requiresReindex,
    });
  }

  // Include library folders that may not yet have vector records (edge recovery).
  for (const documentId of libraryIds) {
    if (seen.has(documentId)) {
      continue;
    }

    const libraryDoc = await getLibraryDocument(documentId);
    if (!libraryDoc) {
      continue;
    }

    const status = await statusStore.getStatus(documentId);

    summaries.push({
      documentId,
      filename: libraryDoc.filename,
      contentHash: libraryDoc.contentHash,
      fileSize: libraryDoc.fileSize,
      totalPages: libraryDoc.totalPages,
      indexedAt: libraryDoc.indexedAt,
      hasPdf: libraryDoc.hasPdf,
      status: status?.status ?? "failed",
      chunkCount: status?.chunkCount,
      error: status?.error,
      stage: status?.stage,
      enabled: true,
      tags: [],
      documentType: inferDocumentType(libraryDoc.filename),
      knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
      requiresReindex: false,
    });
  }

  summaries.sort((left, right) =>
    (right.indexedAt || "").localeCompare(left.indexedAt || ""),
  );

  return summaries;
}

export async function hasIndexedContent(): Promise<boolean> {
  return getVectorStore().hasIndexedContent();
}

export async function retrieveRelevantChunks(
  query: string,
  topK = TOP_K_CHUNKS,
  documentIds?: string[],
): Promise<RetrievedChunk[]> {
  const result = await retrieveWithHybridSearch(query, topK, documentIds);
  return result.chunks;
}

export async function retrieveWithHybridSearch(
  query: string,
  topK = TOP_K_CHUNKS,
  documentIds?: string[],
): Promise<HybridRetrievalResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      chunks: [],
      insufficientRetrieval: false,
      profile: {
        originalQuery: "",
        expandedQuery: "",
        intent: "balanced",
        semanticWeight: 0.7,
        keywordWeight: 0.3,
        exactMatches: [],
      },
    };
  }

  try {
    const startedAt = Date.now();
    const result = await hybridRetrieve(trimmedQuery, topK, { documentIds });
    const searchTimeMs = Date.now() - startedAt;

    const records = await getVectorStore().listDocumentRecords();
    const recordById = new Map(
      records.map((record) => [record.documentId, record]),
    );

    const searchedNames = (
      documentIds?.length
        ? documentIds.map(
            (id) => recordById.get(id)?.filename ?? id,
          )
        : records
            .filter((record) => record.enabled !== false)
            .map((record) => record.filename)
    ).map((name) => name.replace(/\.[^.]+$/, ""));

    console.info("[RAG]");
    console.info(
      `Documents searched:\n${
        searchedNames.length > 0 ? searchedNames.join("\n") : "(none)"
      }`,
    );
    console.info(`Chunks retrieved:\n${result.chunks.length}`);
    console.info(`Search time:\n${searchTimeMs} ms`);

    ragLog(
      "retrieve",
      `Retrieved ${result.chunks.length} chunk(s) for query "${trimmedQuery.slice(0, 80)}" in ${searchTimeMs}ms.`,
    );
    ragDebug("Retrieval results", {
      retrievedChunkCount: result.chunks.length,
      topScore: result.chunks[0]?.similarityScore,
      insufficientRetrieval: result.insufficientRetrieval,
      intent: result.profile.intent,
      documentIds,
      searchTimeMs,
    });

    // Track recently used documents (meta-only — does not rewrite chunk store).
    const usedIds = [...new Set(result.chunks.map((chunk) => chunk.documentId))];
    if (usedIds.length > 0) {
      const usedAt = new Date().toISOString();
      await getVectorStore().updateDocumentRecordsMeta(
        usedIds.map((documentId) => ({
          documentId,
          patch: { lastUsedAt: usedAt },
        })),
      );
    }

    return result;
  } catch (error) {
    ragError("retrieve", "Hybrid retrieval failed.", error);
    throw new RetrievalError(formatEmbeddingError(error));
  }
}

export function resolveIndexingGateMessage(
  documentIds: string[],
  statuses: DocumentIndexState[],
): string | null {
  if (documentIds.length === 0) {
    return null;
  }

  const statusById = new Map(
    statuses.map((status) => [status.documentId, status]),
  );

  const failed: DocumentIndexState[] = [];
  const ready: DocumentIndexState[] = [];
  let pendingCount = 0;

  for (const documentId of documentIds) {
    const status = statusById.get(documentId);

    if (!status || status.status === "indexing") {
      pendingCount += 1;
      continue;
    }

    if (status.status === "failed") {
      failed.push(status);
      continue;
    }

    if (status.status === "ready") {
      ready.push(status);
    }
  }

  if (pendingCount > 0) {
    return "Your documents are still being indexed. Please wait a moment and try again.";
  }

  if (failed.length > 0 && ready.length === 0) {
    return failed
      .map((status) => `${status.filename}: ${status.error ?? "Indexing failed."}`)
      .join("\n");
  }

  return null;
}
