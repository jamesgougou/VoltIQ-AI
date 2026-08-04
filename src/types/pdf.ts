export type PdfParseResult = {
  fileName: string;
  fileSize: number;
  totalPages: number;
  text: string;
};

export type PdfDocument = PdfParseResult & {
  id: string;
};

export const PDF_PREVIEW_CHAR_LIMIT = 3000;
