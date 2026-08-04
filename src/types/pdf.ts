export type PdfParseResult = {
  fileName: string;
  totalPages: number;
  text: string;
};

export const PDF_PREVIEW_CHAR_LIMIT = 3000;
