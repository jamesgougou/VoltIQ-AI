import type { DocumentChunkMetadata, PdfPageText } from "@/types/rag";
import {
  MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  TARGET_CHUNK_SIZE,
} from "@/types/rag";

type ChunkSource = {
  documentId: string;
  documentName: string;
  text: string;
  pageNumber?: number;
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
): { chunks: DocumentChunkMetadata[]; nextIndex: number } {
  const paragraphs = source.text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: DocumentChunkMetadata[] = [];
  let buffer = "";
  let chunkIndex = startIndex;

  function flushBuffer() {
    if (!buffer.trim()) {
      return;
    }

    chunks.push({
      id: createChunkId(source.documentId, chunkIndex),
      documentId: source.documentId,
      documentName: source.documentName,
      pageNumber: source.pageNumber,
      text: buffer.trim(),
    });
    chunkIndex += 1;
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
}): DocumentChunkMetadata[] {
  if (input.pages?.length) {
    const chunks: DocumentChunkMetadata[] = [];
    let chunkIndex = 0;

    for (const page of input.pages) {
      if (!page.text.trim()) {
        continue;
      }

      const result = chunkPlainText(
        {
          documentId: input.documentId,
          documentName: input.documentName,
          text: page.text,
          pageNumber: page.pageNumber,
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
      documentId: input.documentId,
      documentName: input.documentName,
      text: input.text,
    },
    0,
  ).chunks;
}
