export type DocumentIndexStatus = "indexing" | "ready" | "failed";

export type IndexStage =
  | "uploading"
  | "extracting"
  | "chunking"
  | "embedding"
  | "saving"
  | "ready"
  | "failed";

export type DocumentIndexState = {
  documentId: string;
  filename: string;
  status: DocumentIndexStatus;
  stage?: IndexStage;
  progressPercent?: number;
  embeddedChunks?: number;
  totalChunks?: number;
  estimatedSecondsRemaining?: number;
  startedAt?: string;
  error?: string;
  chunkCount?: number;
  updatedAt: string;
};

export type PdfPageText = {
  pageNumber: number;
  text: string;
};

export type DocumentChunk = {
  id: string;
  documentId: string;
  filename: string;
  page?: number;
  chunkIndex: number;
  text: string;
};

export type StoredDocumentChunk = DocumentChunk & {
  embedding: number[];
};

export type RetrievedChunk = DocumentChunk & {
  similarityScore: number;
};

export type RetrievedSourceMetadata = {
  filename: string;
  documentId: string;
  page?: number;
  chunkIndex: number;
  similarityScore: number;
  chunkId: string;
  excerpt: string;
};

export const MAX_CITATION_SOURCES = 5;

export type IndexDocumentRequest = {
  documentId: string;
  documentName: string;
  text: string;
  pages?: PdfPageText[];
  contentHash: string;
};

export type IndexDocumentResult = {
  documentId: string;
  chunkCount: number;
  skipped: boolean;
  status: DocumentIndexStatus;
  error?: string;
};

export const PASTED_TEXT_DOCUMENT_ID = "pasted-text";

export const TARGET_CHUNK_SIZE = 1000;
export const MIN_CHUNK_SIZE = 800;
export const MAX_CHUNK_SIZE = 1200;
export const CHUNK_OVERLAP = 200;
export const TOP_K_CHUNKS = 6;
export const EMBED_BATCH_SIZE = 20;

export function toSourceMetadata(
  chunks: RetrievedChunk[],
): RetrievedSourceMetadata[] {
  return chunks.slice(0, MAX_CITATION_SOURCES).map((chunk) => ({
    filename: chunk.filename,
    documentId: chunk.documentId,
    page: chunk.page,
    chunkIndex: chunk.chunkIndex,
    similarityScore: chunk.similarityScore,
    chunkId: chunk.id,
    excerpt: chunk.text,
  }));
}
