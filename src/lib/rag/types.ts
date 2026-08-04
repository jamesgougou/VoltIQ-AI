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
};

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
};

export const PASTED_TEXT_DOCUMENT_ID = "pasted-text";

export const TARGET_CHUNK_SIZE = 1000;
export const MIN_CHUNK_SIZE = 800;
export const MAX_CHUNK_SIZE = 1200;
export const CHUNK_OVERLAP = 200;
export const TOP_K_CHUNKS = 6;

export function toSourceMetadata(
  chunks: RetrievedChunk[],
): RetrievedSourceMetadata[] {
  return chunks.map((chunk) => ({
    filename: chunk.filename,
    documentId: chunk.documentId,
    page: chunk.page,
    chunkIndex: chunk.chunkIndex,
    similarityScore: chunk.similarityScore,
    chunkId: chunk.id,
  }));
}
