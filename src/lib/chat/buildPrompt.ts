import { DOCUMENT_CHAR_LIMIT } from "@/types/documentContext";
import type { DocumentContextItem } from "@/types/documentContext";
import { VOLTIQ_SYSTEM_PROMPT } from "./systemPrompt";

const SECTION_DIVIDER = "----------------------------------";
const DOCUMENT_DIVIDER = "-------------------------";

function getDocumentText(document: DocumentContextItem): string {
  return (document.ocrText ?? document.text).trim();
}

export function truncateDocumentText(text: string): string {
  if (text.length <= DOCUMENT_CHAR_LIMIT) {
    return text;
  }

  return `${text.slice(0, DOCUMENT_CHAR_LIMIT)}\n\n[Document truncated to first ${DOCUMENT_CHAR_LIMIT.toLocaleString()} characters]`;
}

export function buildDocumentsSection(documents: DocumentContextItem[]): string {
  const usableDocuments = documents.filter((document) => getDocumentText(document));

  if (usableDocuments.length === 0) {
    return "";
  }

  const blocks = usableDocuments.map((document) => {
    const content = truncateDocumentText(getDocumentText(document));

    return `Document:\n${document.name}\n\n${content}`;
  });

  return `Uploaded Documents\n\n${blocks.join(`\n\n${DOCUMENT_DIVIDER}\n\n`)}`;
}

export function buildSystemContent(documents: DocumentContextItem[]): string {
  const documentsSection = buildDocumentsSection(documents);

  if (!documentsSection) {
    return VOLTIQ_SYSTEM_PROMPT;
  }

  return `${VOLTIQ_SYSTEM_PROMPT}\n\n${SECTION_DIVIDER}\n\n${documentsSection}`;
}

export function hasUsableDocumentContent(
  documents: DocumentContextItem[] | undefined,
): boolean {
  if (!documents?.length) {
    return false;
  }

  return documents.some((document) => getDocumentText(document).length > 0);
}

export function getDocumentExtractionError(
  documents: DocumentContextItem[] | undefined,
): string | null {
  if (!documents?.length) {
    return null;
  }

  const hasEmptyDocuments = documents.every(
    (document) => getDocumentText(document).length === 0,
  );

  if (!hasEmptyDocuments) {
    return null;
  }

  return "Unable to extract readable text from the uploaded documents. Please upload a text-based PDF, paste the content directly, or try a different file.";
}
