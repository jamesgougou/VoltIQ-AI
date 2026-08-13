import { describe, expect, it } from "vitest";
import { encodeSourcesTrailer, parseSourcesTrailer } from "./streamMetadata";
import {
  MAX_CITATION_EXCERPT_CHARS,
  toSourceMetadata,
  truncateCitationExcerpt,
  type RetrievedChunk,
} from "./types";
import { excerptSearchQuery } from "@/lib/pdf/textMatch";

describe("citation excerpt truncation", () => {
  const longText = "Clause 2.5 ".repeat(80).trim();

  const chunk: RetrievedChunk = {
    id: "chunk-1",
    documentId: "11111111-1111-4111-8111-111111111111",
    filename: "AS3000.pdf",
    page: 12,
    chunkIndex: 0,
    text: longText,
    similarityScore: 0.9,
  };

  it("truncates excerpts while preserving source metadata", () => {
    const sources = toSourceMetadata([chunk]);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.documentId).toBe(chunk.documentId);
    expect(sources[0]?.filename).toBe("AS3000.pdf");
    expect(sources[0]?.page).toBe(12);
    expect(sources[0]?.chunkId).toBe("chunk-1");
    expect(sources[0]?.excerpt.length).toBeLessThanOrEqual(
      MAX_CITATION_EXCERPT_CHARS,
    );
    expect(sources[0]?.excerpt.length).toBeLessThan(longText.length);
  });

  it("citation trailer parses correctly with truncated excerpts", () => {
    const sources = toSourceMetadata([chunk]);
    const trailer = encodeSourcesTrailer(sources);
    const parsed = parseSourcesTrailer(`Answer${trailer}`);
    expect(parsed.trailerState).toBe("complete");
    expect(parsed.sources[0]?.page).toBe(12);
    expect(parsed.sources[0]?.documentId).toBe(chunk.documentId);
    expect(parsed.sources[0]?.excerpt.length).toBeLessThanOrEqual(
      MAX_CITATION_EXCERPT_CHARS,
    );
  });

  it("PDF highlight query still works with truncated excerpts", () => {
    const excerpt = truncateCitationExcerpt(longText);
    const query = excerptSearchQuery(excerpt);
    expect(query.length).toBeGreaterThan(0);
    expect(query.length).toBeLessThanOrEqual(160);
    expect(longText.toLowerCase()).toContain(query.toLowerCase().slice(0, 20));
  });
});
