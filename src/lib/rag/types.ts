export type DocumentIndexStatus = "indexing" | "ready" | "failed";

export type IndexStage =
  | "uploading"
  | "analysing"
  | "extracting"
  | "chunking"
  | "embedding"
  | "saving"
  | "ready"
  | "failed";

/** Media origin for unified PDF + image retrieval. */
export type DocumentSourceKind = "pdf" | "image" | "text";

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
  sourceKind?: DocumentSourceKind;
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
  sourceKind?: DocumentSourceKind;
  ocrText?: string;
  description?: string;
};

export const MAX_CITATION_SOURCES = 5;

export type IndexDocumentRequest = {
  documentId: string;
  documentName: string;
  text: string;
  pages?: PdfPageText[];
  contentHash: string;
  fileSize?: number;
  totalPages?: number;
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
};

export type IndexImageRequest = {
  documentId: string;
  documentName: string;
  contentHash: string;
  fileSize?: number;
  mimeType: string;
  /** When true, force a fresh vision pass even if hash matches. */
  forceReanalyze?: boolean;
};

export type IndexDocumentResult = {
  documentId: string;
  chunkCount: number;
  skipped: boolean;
  status: DocumentIndexStatus;
  error?: string;
  /** True when an identical contentHash already existed under another/same id. */
  reusedExisting?: boolean;
};

export type LibraryDocumentSummary = {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  hasPdf: boolean;
  hasImage?: boolean;
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
  status: DocumentIndexStatus;
  chunkCount?: number;
  error?: string;
  stage?: IndexStage;
  enabled: boolean;
  tags: string[];
  lastUsedAt?: string;
  documentType: string;
  embeddingModel?: string;
  knowledgeBaseVersion?: string;
  requiresReindex?: boolean;
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
  // Citation UI remains PDF-oriented for now — exclude image chunks from the
  // streamed citation payload while preserving internal retrieval for prompts.
  const citable = chunks.filter((chunk) => chunk.sourceKind !== "image");

  return citable.slice(0, MAX_CITATION_SOURCES).map((chunk) => ({
    filename: chunk.filename,
    documentId: chunk.documentId,
    page: chunk.page,
    chunkIndex: chunk.chunkIndex,
    similarityScore: chunk.similarityScore,
    chunkId: chunk.id,
    excerpt: chunk.text,
    sourceKind: chunk.sourceKind,
  }));
}
