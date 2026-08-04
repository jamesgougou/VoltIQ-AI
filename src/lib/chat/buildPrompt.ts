import type { DocumentContextItem } from "@/types/documentContext";
import type { RetrievedChunk } from "@/lib/rag/types";
import { VOLTIQ_SYSTEM_PROMPT } from "./systemPrompt";

const SECTION_DIVIDER = "--------------------------------";

function getDocumentText(document: DocumentContextItem): string {
  return (document.ocrText ?? document.text).trim();
}

export function buildRetrievedContextSection(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  const blocks = chunks.map((chunk, index) => {
    const sourceParts = [chunk.filename];

    if (chunk.page !== undefined) {
      sourceParts.push(`Page ${chunk.page}`);
    }

    return `Chunk ${index + 1}\n(${sourceParts.join(" | ")})\n\n${chunk.text}`;
  });

  return `Retrieved Document Context\n\n${blocks.join("\n\n")}`;
}

export function buildSystemContent(chunks: RetrievedChunk[]): string {
  const retrievedSection = buildRetrievedContextSection(chunks);

  if (!retrievedSection) {
    return `${VOLTIQ_SYSTEM_PROMPT}\n\nNo relevant document chunks were retrieved for this question. If the user expects an answer from uploaded documents, clearly state that the uploaded documents do not contain the requested information before offering any general knowledge.`;
  }

  return `${VOLTIQ_SYSTEM_PROMPT}\n\n${SECTION_DIVIDER}\n\n${retrievedSection}`;
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
