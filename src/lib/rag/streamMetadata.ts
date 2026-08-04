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
    const sources = JSON.parse(
      content.slice(jsonStart, endIndex),
    ) as RetrievedSourceMetadata[];

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
