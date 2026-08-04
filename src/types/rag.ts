export type PdfPageText = {
  pageNumber: number;
  text: string;
};

export type DocumentChunkMetadata = {
  id: string;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  text: string;
};

export type StoredDocumentChunk = DocumentChunkMetadata & {
  embedding: number[];
};

export type RetrievedChunk = DocumentChunkMetadata & {
  score: number;
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
export const TOP_K_CHUNKS = 5;

export const TARGET_CHUNK_SIZE = 900;
export const MIN_CHUNK_SIZE = 800;
export const MAX_CHUNK_SIZE = 1000;
