import type { DocumentChunk, PdfPageText } from "@/lib/rag/types";
import {
  CHUNK_OVERLAP,
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  TARGET_CHUNK_SIZE,
} from "@/lib/rag/types";

type ChunkSource = {
  documentId: string;
  filename: string;
  text: string;
  page?: number;
};

function createChunkId(documentId: string, index: number): string {
  return `${documentId}-chunk-${index}`;
}

function splitLongText(text: string): string[] {
  const parts: string[] = [];
  let remaining = text.trim();

  while (remaining.length > MAX_CHUNK_SIZE) {
    let splitAt = remaining.lastIndexOf(". ", MAX_CHUNK_SIZE);

    if (splitAt < MIN_CHUNK_SIZE) {
      splitAt = remaining.lastIndexOf(" ", MAX_CHUNK_SIZE);
    }

    if (splitAt < MIN_CHUNK_SIZE) {
      splitAt = MAX_CHUNK_SIZE;
    }

    parts.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    parts.push(remaining);
  }

  return parts;
}

function chunkPlainText(
  source: ChunkSource,
  startIndex: number,
): { chunks: DocumentChunk[]; nextIndex: number } {
  const paragraphs = source.text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: DocumentChunk[] = [];
  let buffer = "";
  let overlapPrefix = "";
  let chunkIndex = startIndex;

  function flushBuffer() {
    const fullText = `${overlapPrefix}${buffer}`.trim();

    if (!fullText) {
      return;
    }

    chunks.push({
      id: createChunkId(source.documentId, chunkIndex),
      documentId: source.documentId,
      filename: source.filename,
      page: source.page,
      chunkIndex,
      text: fullText,
    });

    chunkIndex += 1;
    overlapPrefix =
      fullText.length > CHUNK_OVERLAP
        ? fullText.slice(fullText.length - CHUNK_OVERLAP)
        : fullText;
    buffer = "";
  }

  for (const paragraph of paragraphs) {
    const segments =
      paragraph.length > MAX_CHUNK_SIZE ? splitLongText(paragraph) : [paragraph];

    for (const segment of segments) {
      const candidate = buffer ? `${buffer}\n\n${segment}` : segment;

      if (candidate.length > MAX_CHUNK_SIZE && buffer) {
        flushBuffer();
        buffer = segment;
      } else {
        buffer = candidate;
      }

      if (buffer.length >= TARGET_CHUNK_SIZE) {
        flushBuffer();
      }
    }
  }

  flushBuffer();

  return { chunks, nextIndex: chunkIndex };
}

export function chunkDocument(input: {
  documentId: string;
  documentName: string;
  text: string;
  pages?: PdfPageText[];
}): DocumentChunk[] {
  const sourceBase = {
    documentId: input.documentId,
    filename: input.documentName,
  };

  if (input.pages?.length) {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    for (const page of input.pages) {
      if (!page.text.trim()) {
        continue;
      }

      const result = chunkPlainText(
        {
          ...sourceBase,
          text: page.text,
          page: page.pageNumber,
        },
        chunkIndex,
      );

      chunks.push(...result.chunks);
      chunkIndex = result.nextIndex;
    }

    return chunks;
  }

  return chunkPlainText(
    {
      ...sourceBase,
      text: input.text,
    },
    0,
  ).chunks;
}
