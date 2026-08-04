export type DocumentContextItem = {
  id: string;
  name: string;
  text: string;
  ocrText?: string;
  totalPages?: number;
  fileSize?: number;
};

export type DocumentContextPayload = DocumentContextItem[];
