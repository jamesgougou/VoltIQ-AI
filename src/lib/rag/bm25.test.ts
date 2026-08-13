import { describe, expect, it } from "vitest";
import { buildBM25Index } from "./bm25";
import type { StoredDocumentChunk } from "./types";

function chunk(
  id: string,
  documentId: string,
  text: string,
): StoredDocumentChunk {
  return {
    id,
    documentId,
    filename: `${documentId}.pdf`,
    chunkIndex: 0,
    text,
    embedding: [1, 0, 0],
  };
}

describe("BM25 term-frequency precomputation", () => {
  it("preserves scoring semantics for repeated queries", () => {
    const chunks = [
      chunk("c1", "doc-a", "Clause 2.5 RCD testing requirements"),
      chunk("c2", "doc-b", "Cable sizing for 2.5 mm conductors"),
    ];

    const index = buildBM25Index(chunks);
    const first = index.search("Clause 2.5 RCD", 5);
    const second = index.search("Clause 2.5 RCD", 5);

    expect(first).toEqual(second);
    expect(first[0]?.chunkId).toBe("c1");
  });

  it("scoped indexes only include eligible documents", () => {
    const all = [
      chunk("c1", "doc-a", "MEN earthing system"),
      chunk("c2", "doc-b", "Solar inverter isolation"),
    ];
    const scoped = buildBM25Index(all.filter((c) => c.documentId === "doc-a"));
    const results = scoped.search("MEN earthing", 5);

    expect(results.every((result) => result.chunkId === "c1")).toBe(true);
    expect(results.some((result) => result.chunkId === "c2")).toBe(false);
  });
});
