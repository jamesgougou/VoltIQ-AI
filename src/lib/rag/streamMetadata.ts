import type { RetrievedSourceMetadata } from "@/lib/rag/types";

export const VOLTIQ_SOURCES_MARKER = "<!--VOLTIQ_SOURCES:";
export const VOLTIQ_SOURCES_END = "-->";

export function encodeSourcesTrailer(
  sources: RetrievedSourceMetadata[],
): string {
  return `${VOLTIQ_SOURCES_MARKER}${JSON.stringify(sources)}${VOLTIQ_SOURCES_END}`;
}

export function parseSourcesTrailer(content: string): {
  content: string;
  sources: RetrievedSourceMetadata[];
} {
  const markerIndex = content.indexOf(VOLTIQ_SOURCES_MARKER);

  if (markerIndex < 0) {
    return { content, sources: [] };
  }

  const jsonStart = markerIndex + VOLTIQ_SOURCES_MARKER.length;
  const endIndex = content.indexOf(VOLTIQ_SOURCES_END, jsonStart);

  if (endIndex < 0) {
    return {
      content: content.slice(0, markerIndex),
      sources: [],
    };
  }

  try {
    const parsed = JSON.parse(
      content.slice(jsonStart, endIndex),
    ) as RetrievedSourceMetadata[];

    const sources = parsed
      .filter((source) => source && typeof source === "object")
      .map((source) => ({
        filename: typeof source.filename === "string" ? source.filename : "",
        documentId:
          typeof source.documentId === "string" ? source.documentId : "",
        page: typeof source.page === "number" ? source.page : undefined,
        chunkIndex:
          typeof source.chunkIndex === "number" ? source.chunkIndex : 0,
        similarityScore:
          typeof source.similarityScore === "number"
            ? source.similarityScore
            : 0,
        chunkId: typeof source.chunkId === "string" ? source.chunkId : "",
        excerpt: typeof source.excerpt === "string" ? source.excerpt : "",
      }));

    return {
      content: content.slice(0, markerIndex),
      sources,
    };
  } catch {
    return {
      content: content.slice(0, markerIndex),
      sources: [],
    };
  }
}

export function stripSourcesMarkerFromStream(
  accumulated: string,
  previouslyEmittedLength: number,
): {
  emitted: string;
  nextEmittedLength: number;
  complete: boolean;
  sources: RetrievedSourceMetadata[];
} {
  const markerIndex = accumulated.indexOf(VOLTIQ_SOURCES_MARKER);

  if (markerIndex < 0) {
    const emitted = accumulated.slice(previouslyEmittedLength);
    return {
      emitted,
      nextEmittedLength: accumulated.length,
      complete: false,
      sources: [],
    };
  }

  const parsed = parseSourcesTrailer(accumulated);

  return {
    emitted: parsed.content.slice(previouslyEmittedLength),
    nextEmittedLength: parsed.content.length,
    complete: true,
    sources: parsed.sources,
  };
}
