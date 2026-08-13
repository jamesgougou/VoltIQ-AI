import type { RetrievedSourceMetadata } from "@/lib/rag/types";

export const VOLTIQ_SOURCES_MARKER = "<!--VOLTIQ_SOURCES:";
export const VOLTIQ_SOURCES_END = "-->";

export function encodeSourcesTrailer(
  sources: RetrievedSourceMetadata[],
): string {
  return `${VOLTIQ_SOURCES_MARKER}${JSON.stringify(sources)}${VOLTIQ_SOURCES_END}`;
}

function normalizeSources(parsed: unknown): RetrievedSourceMetadata[] {
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((source) => source && typeof source === "object")
    .map((source) => {
      const item = source as Partial<RetrievedSourceMetadata>;
      return {
        filename: typeof item.filename === "string" ? item.filename : "",
        documentId:
          typeof item.documentId === "string" ? item.documentId : "",
        page: typeof item.page === "number" ? item.page : undefined,
        chunkIndex:
          typeof item.chunkIndex === "number" ? item.chunkIndex : 0,
        similarityScore:
          typeof item.similarityScore === "number" ? item.similarityScore : 0,
        chunkId: typeof item.chunkId === "string" ? item.chunkId : "",
        excerpt: typeof item.excerpt === "string" ? item.excerpt : "",
      };
    });
}

export function parseSourcesTrailer(content: string): {
  content: string;
  sources: RetrievedSourceMetadata[];
  /** absent = no marker; incomplete = marker without full trailer; complete = end delimiter reached */
  trailerState: "absent" | "incomplete" | "complete";
} {
  const markerIndex = content.indexOf(VOLTIQ_SOURCES_MARKER);

  if (markerIndex < 0) {
    return { content, sources: [], trailerState: "absent" };
  }

  const jsonStart = markerIndex + VOLTIQ_SOURCES_MARKER.length;
  const endIndex = content.indexOf(VOLTIQ_SOURCES_END, jsonStart);

  if (endIndex < 0) {
    return {
      content: content.slice(0, markerIndex),
      sources: [],
      trailerState: "incomplete",
    };
  }

  try {
    const parsed = JSON.parse(content.slice(jsonStart, endIndex)) as unknown;

    return {
      content: content.slice(0, markerIndex),
      sources: normalizeSources(parsed),
      trailerState: "complete",
    };
  } catch {
    // Trailer finished but JSON was corrupt — treat as complete so the client
    // does not hang waiting for more bytes.
    return {
      content: content.slice(0, markerIndex),
      sources: [],
      trailerState: "complete",
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

  if (parsed.trailerState === "incomplete") {
    // Hold back the trailer bytes; emit only visible answer text.
    const safeEnd = markerIndex;
    const emitted =
      previouslyEmittedLength < safeEnd
        ? accumulated.slice(previouslyEmittedLength, safeEnd)
        : "";

    return {
      emitted,
      nextEmittedLength: Math.max(previouslyEmittedLength, safeEnd),
      complete: false,
      sources: [],
    };
  }

  // complete (or absent after parse — should not happen when marker exists)
  return {
    emitted: parsed.content.slice(previouslyEmittedLength),
    nextEmittedLength: parsed.content.length,
    complete: parsed.trailerState === "complete",
    sources: parsed.sources,
  };
}
