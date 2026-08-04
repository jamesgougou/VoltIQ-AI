export const DOCUMENT_CHAR_LIMIT = 15_000;

export type DocumentContextItem = {
  name: string;
  text: string;
  ocrText?: string;
};

export type DocumentContextPayload = DocumentContextItem[];
