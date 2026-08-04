export type DocumentContextItem = {
  id: string;
  name: string;
  text: string;
  ocrText?: string;
};

export type DocumentContextPayload = DocumentContextItem[];
