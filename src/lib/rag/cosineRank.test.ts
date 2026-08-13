import { describe, expect, it } from "vitest";
import { rankChunksByCosine } from "./store";
import type { StoredDocumentChunk } from "./types";

function chunk(
  id: string,
  documentId: string,
  embedding: number[],
): StoredDocumentChunk {
  return {
    id,
    documentId,
    filename: `${documentId}.pdf`,
    chunkIndex: 0,
    text: id,
    embedding,
  };
}

describe("rankChunksByCosine scope pre-filter", () => {
  const chunks = [
    chunk("a1", "doc-a", [1, 0, 0]),
    chunk("b1", "doc-b", [0.9, 0.1, 0]),
    chunk("a2", "doc-a", [0.5, 0.5, 0]),
  ];
  const query = [1, 0, 0];

  it("only returns eligible scoped candidates", () => {
    const results = rankChunksByCosine(
      chunks,
      query,
      10,
      new Set(["doc-a"]),
    );

    expect(results.map((r) => r.id)).toEqual(["a1", "a2"]);
    expect(results.every((r) => r.documentId === "doc-a")).toBe(true);
  });

  it("unscoped ranking includes all documents in cosine order", () => {
    const results = rankChunksByCosine(chunks, query, 10, null);
    expect(results.map((r) => r.id)).toEqual(["a1", "b1", "a2"]);
  });

  it("preserves relative ranking among eligible chunks", () => {
    const scoped = rankChunksByCosine(chunks, query, 10, new Set(["doc-a"]));
    const fullThenFilter = rankChunksByCosine(chunks, query, 10, null).filter(
      (r) => r.documentId === "doc-a",
    );

    expect(scoped.map((r) => r.id)).toEqual(fullThenFilter.map((r) => r.id));
  });
});
