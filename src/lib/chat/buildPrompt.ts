import type { DocumentContextItem } from "@/types/documentContext";
import type { RetrievedChunk } from "@/lib/rag/types";
import { VOLTIQ_SYSTEM_PROMPT } from "./systemPrompt";

const SECTION_DIVIDER = "--------------------------------";

const GROUNDED_ANSWER_GUIDANCE = `Answer using only the retrieved chunks below for document-grounded claims.

- Cite filename and page exactly as shown in each chunk header when discussing PDF content.
- Do not invent AS/NZS standards, clause numbers, requirements, wording, quotations, or page numbers that are not present in the chunks.
- If the chunks only partially answer the question, state what information is missing from the uploaded documents.
- If you add anything beyond the chunks, put it under a separate heading: "General knowledge". Never present that material as content from an uploaded standard.

For AS/NZS, clause, section, table, or requirement questions, use this structure:
Answer
Requirement / Finding
Explanation
Practical application
Source / Page

- Put document-grounded findings under Answer / Requirement / Finding / Explanation / Practical application / Source / Page.
- For Source / Page, copy filename and page from the chunk headers only.
- If the exact requested clause or requirement is not in the chunks, say so explicitly before reporting any related finding.
- Keep any General knowledge section separate and after the standards structure.`;

function getDocumentText(document: DocumentContextItem): string {
  return (document.ocrText ?? document.text).trim();
}

function formatChunkBlock(chunk: RetrievedChunk, index: number): string {
  const sourceParts = [chunk.filename];

  if (chunk.sourceKind === "image") {
    sourceParts.push("Image");
  } else if (chunk.page !== undefined) {
    sourceParts.push(`Page ${chunk.page}`);
  }

  return `Chunk ${index + 1}\n(${sourceParts.join(" | ")})\n\n${chunk.text}`;
}

export function buildRetrievedContextSection(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  const pdfChunks = chunks.filter((chunk) => chunk.sourceKind !== "image");
  const imageChunks = chunks.filter((chunk) => chunk.sourceKind === "image");

  const sections: string[] = [];

  if (pdfChunks.length > 0) {
    const blocks = pdfChunks.map((chunk, index) =>
      formatChunkBlock(chunk, index),
    );
    sections.push(`Retrieved PDF Chunks\n\n${blocks.join("\n\n")}`);
  }

  if (imageChunks.length > 0) {
    const blocks = imageChunks.map((chunk, index) =>
      formatChunkBlock(chunk, index),
    );
    sections.push(`Retrieved Image Chunks\n\n${blocks.join("\n\n")}`);
  }

  // Fallback if sourceKind is absent on all chunks (legacy indexes).
  if (sections.length === 0) {
    const blocks = chunks.map((chunk, index) => formatChunkBlock(chunk, index));
    sections.push(`Retrieved Document Context\n\n${blocks.join("\n\n")}`);
  }

  return sections.join(`\n\n${SECTION_DIVIDER}\n\n`);
}

export function buildSystemContent(
  chunks: RetrievedChunk[],
  options?: { insufficientRetrieval?: boolean },
): string {
  if (options?.insufficientRetrieval) {
    return `${VOLTIQ_SYSTEM_PROMPT}\n\nThe retrieval engine could not find sufficiently relevant content in the uploaded PDFs or images for this question.\n\nYou MUST begin your response with exactly: "I couldn't find sufficient information in the uploaded documents."\n\nAfter that sentence, you may provide clearly labelled general Australian electrical knowledge under the heading "General knowledge" if appropriate. Do not present it as document or image content, and never present it as content from an uploaded standard. Do not invent citations, AS/NZS standards, clause numbers, clause wording, page numbers, or quotations.`;
  }

  const retrievedSection = buildRetrievedContextSection(chunks);

  if (!retrievedSection) {
    return `${VOLTIQ_SYSTEM_PROMPT}\n\nNo relevant PDF or image chunks were retrieved for this question.\n\nClearly state that the uploaded PDFs and images do not contain enough information for this question before offering any general knowledge.\n\nIf you provide general knowledge, place it under the heading "General knowledge" and do not invent citations, AS/NZS standards, clause numbers, clause wording, or page numbers. Never present general knowledge as content from an uploaded standard.`;
  }

  return `${VOLTIQ_SYSTEM_PROMPT}\n\n${GROUNDED_ANSWER_GUIDANCE}\n\n${SECTION_DIVIDER}\n\n${retrievedSection}`;
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

  return "Unable to extract readable text from the uploaded documents. Please upload a text-based PDF, an image with readable text, paste the content directly, or try a different file.";
}
