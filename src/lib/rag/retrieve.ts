import { chunkDocument } from "@/lib/rag/chunk";
import {
  embedTextsInBatches,
  formatEmbeddingError,
} from "@/lib/rag/embed";
import { clearEmbeddingCache } from "@/lib/rag/embeddingCache";
import { hybridRetrieve, type HybridRetrievalResult } from "@/lib/rag/hybridSearch";
import { getIndexStatusStore } from "@/lib/rag/indexStatus";
import { ragDebug, ragError, ragLog } from "@/lib/rag/logger";
import { getVectorStore } from "@/lib/rag/store";
import type {
  DocumentIndexState,
  IndexDocumentRequest,
  IndexDocumentResult,
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
} {
  const extractedPageCount = request.pages?.length ?? 0;
  const textFromPages =
    request.pages?.map((page) => page.text).join("\n\n").trim() ?? "";
  const text = request.text.trim() || textFromPages;

  return { text, extractedPageCount };
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
): Promise<IndexDocumentResult> {
  const vectorStore = getVectorStore();
  const statusStore = getIndexStatusStore();
  const { documentId, documentName, contentHash } = request;
  const { text, extractedPageCount } = resolveDocumentText(request);
  const debugDocument = isDebugDocument(documentName);

  ragLog("upload", `Uploading document: ${documentName} (${documentId})`);
  ragLog(
    "extract",
    `Extracting text for ${documentName}: ${extractedPageCount} pages, ${text.length.toLocaleString()} characters.`,
  );

  if (debugDocument) {
    ragDebug("AS3000 upload stats", {
      extractedPages: extractedPageCount,
      characterCount: text.length,
    });
  }

  const existing = await vectorStore.getDocumentRecord(documentId);

  if (existing?.contentHash === contentHash) {
    const storedChunkCount = await vectorStore.getStoredChunkCount(documentId);
    await vectorStore.verifyDocumentStorage(documentId, storedChunkCount);

    await statusStore.setStatus(documentId, documentName, "ready", {
      chunkCount: storedChunkCount,
      stage: "ready",
      totalChunks: storedChunkCount,
    });

    ragLog(
      "ready",
      `Marking document READY: ${documentName} (skipped, already indexed, ${storedChunkCount} chunks).`,
    );

    return {
      documentId,
      chunkCount: storedChunkCount,
      skipped: true,
      status: "ready",
    };
  }

  await statusStore.setStatus(documentId, documentName, "indexing", {
    stage: "extracting",
  });

  try {
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
    );

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

    ragLog(
      "store",
      `Saving embeddings for ${documentName}: ${storedChunks.length} chunks.`,
    );

    await vectorStore.insertChunks(
      documentId,
      documentName,
      contentHash,
      storedChunks,
    );

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
    const message = formatEmbeddingError(error);

    ragError("failed", `Indexing failed for ${documentName}: ${message}`, error);

    await vectorStore.deleteDocument(documentId);
    await statusStore.setStatus(documentId, documentName, "failed", {
      error: message,
      stage: "failed",
    });

    throw new RetrievalError(message);
  }
}

export async function deleteIndexedDocument(documentId: string): Promise<void> {
  await getVectorStore().deleteDocument(documentId);
  await getIndexStatusStore().removeStatus(documentId);
}

export async function rebuildVectorIndex(): Promise<void> {
  await getVectorStore().rebuild();
  await getIndexStatusStore().clearAll();
  clearEmbeddingCache();
}

export async function hasIndexedContent(): Promise<boolean> {
  return getVectorStore().hasIndexedContent();
}

export async function retrieveRelevantChunks(
  query: string,
  topK = TOP_K_CHUNKS,
): Promise<RetrievedChunk[]> {
  const result = await retrieveWithHybridSearch(query, topK);
  return result.chunks;
}

export async function retrieveWithHybridSearch(
  query: string,
  topK = TOP_K_CHUNKS,
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
    const result = await hybridRetrieve(trimmedQuery, topK);

    ragLog(
      "retrieve",
      `Retrieved ${result.chunks.length} chunk(s) for query "${trimmedQuery.slice(0, 80)}".`,
    );
    ragDebug("Retrieval results", {
      retrievedChunkCount: result.chunks.length,
      topScore: result.chunks[0]?.similarityScore,
      insufficientRetrieval: result.insufficientRetrieval,
      intent: result.profile.intent,
    });

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
