export type DocumentContextItem = {
  id: string;
  name: string;
  text: string;
  ocrText?: string;
  totalPages?: number;
  fileSize?: number;
  /** When false, document is stored but excluded from RAG retrieval. */
  enabled?: boolean;
};

export type DocumentContextPayload = DocumentContextItem[];
