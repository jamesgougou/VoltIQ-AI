import { describe, expect, it } from "vitest";
import {
  encodeSourcesTrailer,
  parseSourcesTrailer,
  stripSourcesMarkerFromStream,
} from "./streamMetadata";
import type { RetrievedSourceMetadata } from "./types";

const sampleSources: RetrievedSourceMetadata[] = [
  {
    filename: "AS3000.pdf",
    documentId: "11111111-1111-1111-1111-111111111111",
    page: 12,
    chunkIndex: 0,
    similarityScore: 0.8,
    chunkId: "chunk-1",
    excerpt: "Clause example",
  },
];

describe("stripSourcesMarkerFromStream", () => {
  it("keeps buffering when the trailer is split across chunks", () => {
    const trailer = encodeSourcesTrailer(sampleSources);
    const answer = "Hello answer. ";
    const full = `${answer}${trailer}`;

    const splitAt = answer.length + "<!--VOLTIQ_SOURCES:".length + 10;
    const first = full.slice(0, splitAt);
    const second = full.slice(splitAt);

    const partial = stripSourcesMarkerFromStream(first, 0);
    expect(partial.complete).toBe(false);
    expect(partial.emitted).toBe(answer);
    expect(partial.sources).toEqual([]);

    const accumulated = first + second;
    const done = stripSourcesMarkerFromStream(
      accumulated,
      partial.nextEmittedLength,
    );

    expect(done.complete).toBe(true);
    expect(done.emitted).toBe("");
    expect(done.sources).toHaveLength(1);
    expect(done.sources[0]?.filename).toBe("AS3000.pdf");
    expect(done.sources[0]?.page).toBe(12);
  });

  it("does not mark complete on marker alone", () => {
    const result = stripSourcesMarkerFromStream(
      "Visible text<!--VOLTIQ_SOURCES:[",
      0,
    );

    expect(result.complete).toBe(false);
    expect(result.emitted).toBe("Visible text");
    expect(result.sources).toEqual([]);
  });

  it("parses a complete trailer in one pass", () => {
    const trailer = encodeSourcesTrailer(sampleSources);
    const result = stripSourcesMarkerFromStream(`Answer${trailer}`, 0);

    expect(result.complete).toBe(true);
    expect(result.emitted).toBe("Answer");
    expect(result.sources[0]?.documentId).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });
});

describe("parseSourcesTrailer", () => {
  it("reports incomplete until the end delimiter arrives", () => {
    const parsed = parseSourcesTrailer(
      "Hi<!--VOLTIQ_SOURCES:[{\"filename\":\"x\"}",
    );
    expect(parsed.trailerState).toBe("incomplete");
    expect(parsed.content).toBe("Hi");
    expect(parsed.sources).toEqual([]);
  });
});
