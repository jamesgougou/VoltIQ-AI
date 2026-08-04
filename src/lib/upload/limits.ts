export const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_SIZE_LABEL = "100 MB";

export const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_SIZE_LABEL = "20 MB";

export function getPdfSizeError(): string {
  return `PDF file must be ${MAX_PDF_SIZE_LABEL} or smaller.`;
}

export function getImageSizeError(fileName: string): string {
  return `"${fileName}" exceeds the ${MAX_IMAGE_SIZE_LABEL} per-image limit.`;
}
