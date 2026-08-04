import { chunkDocument } from "@/lib/rag/chunker";
import { embedQuery, embedTexts } from "@/lib/rag/embeddings";
import { getVectorStore } from "@/lib/rag/vectorStore";
import type {
  IndexDocumentRequest,
  IndexDocumentResult,
  RetrievedChunk,
  StoredDocumentChunk,
} from "@/types/rag";
import { TOP_K_CHUNKS } from "@/types/rag";

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

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
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

export async function retrieveRelevantChunks(
  query: string,
  topK = TOP_K_CHUNKS,
): Promise<RetrievedChunk[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const hasIndexedContent = await getVectorStore().hasIndexedContent();

  if (!hasIndexedContent) {
    return [];
  }

  const queryEmbedding = await embedQuery(trimmedQuery);
  return getVectorStore().similaritySearch(queryEmbedding, topK);
}
