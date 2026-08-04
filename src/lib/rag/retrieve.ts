import { chunkDocument } from "@/lib/rag/chunk";
import { embedQuery, embedTexts } from "@/lib/rag/embed";
import { getVectorStore } from "@/lib/rag/store";
import type {
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

export async function indexDocument(
  request: IndexDocumentRequest,
): Promise<IndexDocumentResult> {
  const vectorStore = getVectorStore();
  const existing = await vectorStore.getDocumentRecord(request.documentId);

  if (existing?.contentHash === request.contentHash) {
    return {
      documentId: request.documentId,
      chunkCount: existing.chunkIds.length,
      skipped: true,
    };
  }

  const chunks = chunkDocument({
    documentId: request.documentId,
    documentName: request.documentName,
    text: request.text,
    pages: request.pages,
  });

  if (chunks.length === 0) {
    await vectorStore.deleteDocument(request.documentId);
    return {
      documentId: request.documentId,
      chunkCount: 0,
      skipped: false,
    };
  }

  let embeddings: number[][];

  try {
    embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
  } catch (error) {
    console.error("Embedding generation failed during indexing:", error);
    throw new RetrievalError(
      "Unable to generate embeddings for this document. Please try again.",
    );
  }

  const storedChunks: StoredDocumentChunk[] = chunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index],
  }));

  await vectorStore.insertChunks(
    request.documentId,
    request.documentName,
    request.contentHash,
    storedChunks,
  );

  return {
    documentId: request.documentId,
    chunkCount: storedChunks.length,
    skipped: false,
  };
}

export async function deleteIndexedDocument(documentId: string): Promise<void> {
  await getVectorStore().deleteDocument(documentId);
}

export async function rebuildVectorIndex(): Promise<void> {
  await getVectorStore().rebuild();
}

export async function hasIndexedContent(): Promise<boolean> {
  return getVectorStore().hasIndexedContent();
}

export async function retrieveRelevantChunks(
  query: string,
  topK = TOP_K_CHUNKS,
): Promise<RetrievedChunk[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const vectorStore = getVectorStore();
  const indexed = await vectorStore.hasIndexedContent();

  if (!indexed) {
    return [];
  }

  try {
    const queryEmbedding = await embedQuery(trimmedQuery);
    return vectorStore.similaritySearch(queryEmbedding, topK);
  } catch (error) {
    console.error("Embedding generation failed during retrieval:", error);
    throw new RetrievalError(
      "Unable to search your documents right now. Please try again.",
    );
  }
}
