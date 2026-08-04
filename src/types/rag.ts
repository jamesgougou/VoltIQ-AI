export type {
  DocumentChunk,
  IndexDocumentRequest,
  IndexDocumentResult,
  PdfPageText,
  RetrievedChunk,
  RetrievedSourceMetadata,
  StoredDocumentChunk,
} from "@/lib/rag/types";

export {
  CHUNK_OVERLAP,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  PASTED_TEXT_DOCUMENT_ID,
  TARGET_CHUNK_SIZE,
  TOP_K_CHUNKS,
  toSourceMetadata,
} from "@/lib/rag/types";
