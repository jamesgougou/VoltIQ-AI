import type {
  DocumentContextItem,
  UploadedDocument,
} from "@/types/documentContext";
import { DOCUMENT_CHAR_LIMIT } from "@/types/documentContext";
import type { RetrievedChunk } from "@/types/rag";
import { VOLTIQ_SYSTEM_PROMPT } from "./systemPrompt";

const SECTION_DIVIDER = "----------------------------------";
const DOCUMENT_DIVIDER = "-------------------------";

function getDocumentText(document: DocumentContextItem | UploadedDocument): string {
  const ocrText = "ocrText" in document ? document.ocrText : undefined;
  return (ocrText ?? document.text).trim();
}

export function truncateDocumentText(text: string): string {
  if (text.length <= DOCUMENT_CHAR_LIMIT) {
    return text;
  }

  return `${text.slice(0, DOCUMENT_CHAR_LIMIT)}\n\n[Document truncated to first ${DOCUMENT_CHAR_LIMIT.toLocaleString()} characters]`;
}

export function buildUploadedDocumentsSection(
  uploadedDocuments: UploadedDocument[],
): string {
  const usableDocuments = uploadedDocuments.filter(
    (document) => getDocumentText(document).length > 0,
  );

  if (usableDocuments.length === 0) {
    return "";
  }

  const blocks = usableDocuments.map((document) => {
    const content = truncateDocumentText(getDocumentText(document));

    return `Document:\n${document.fileName}\n\n${content}`;
  });

  return `Uploaded Documents\n\n${blocks.join(`\n\n${DOCUMENT_DIVIDER}\n\n`)}`;
}

export function buildSystemContentWithUploadedDocuments(
  uploadedDocuments: UploadedDocument[],
): string {
  const documentsSection = buildUploadedDocumentsSection(uploadedDocuments);

  if (!documentsSection) {
    return VOLTIQ_SYSTEM_PROMPT;
  }

  return `${VOLTIQ_SYSTEM_PROMPT}\n\n${SECTION_DIVIDER}\n\n${documentsSection}`;
}

export function buildRetrievedContextSection(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  const blocks = chunks.map((chunk, index) => {
    const sourceLabel = chunk.pageNumber
      ? `${chunk.documentName}, Page ${chunk.pageNumber}`
      : chunk.documentName;

    return `Chunk ${index + 1}\n(Source: ${sourceLabel})\n\n${chunk.text}`;
  });

  return `Retrieved Context\n\n${blocks.join("\n\n")}`;
}

export function buildSystemContentFromRetrieval(
  chunks: RetrievedChunk[],
): string {
  const retrievedSection = buildRetrievedContextSection(chunks);

  if (!retrievedSection) {
    return VOLTIQ_SYSTEM_PROMPT;
  }

  return `${VOLTIQ_SYSTEM_PROMPT}\n\n${SECTION_DIVIDER}\n\n${retrievedSection}`;
}

export function buildSystemContent(
  uploadedDocuments: UploadedDocument[],
  retrievedChunks: RetrievedChunk[] = [],
): string {
  if (uploadedDocuments.length > 0) {
    return buildSystemContentWithUploadedDocuments(uploadedDocuments);
  }

  return buildSystemContentFromRetrieval(retrievedChunks);
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
