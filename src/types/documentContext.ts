export const DOCUMENT_CHAR_LIMIT = 15_000;

export type UploadedDocument = {
  fileName: string;
  text: string;
  totalPages?: number;
  fileSize?: number;
  ocrText?: string;
};

export type DocumentContextItem = {
  id: string;
  name: string;
  text: string;
  ocrText?: string;
  totalPages?: number;
  fileSize?: number;
};

export type DocumentContextPayload = DocumentContextItem[];

export function toUploadedDocuments(
  documents: DocumentContextItem[],
): UploadedDocument[] {
  return documents
    .map((document) => ({
      fileName: document.name,
      text: (document.ocrText ?? document.text).trim(),
      totalPages: document.totalPages,
      fileSize: document.fileSize,
      ocrText: document.ocrText,
    }))
    .filter((document) => document.text.length > 0);
}
