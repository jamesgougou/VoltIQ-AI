import { afterEach, describe, expect, it } from "vitest";
import {
  getOrBuildScopedBM25Index,
  getScopedBM25CacheBuildCount,
  invalidateScopedBM25Cache,
  resetScopedBM25CacheForTests,
} from "./scopedBm25Cache";
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
    embedding: [1, 0],
  };
}

afterEach(() => {
  resetScopedBM25CacheForTests();
});

describe("scoped BM25 cache", () => {
  const docA = [chunk("a1", "doc-a", "Clause 2.5 residual current device")];
  const docB = [chunk("b1", "doc-b", "Voltage drop calculation example")];
  const both = [...docA, ...docB];

  it("reuses the index on cache hit", () => {
    getOrBuildScopedBM25Index(docA, "1:1", ["doc-a"]);
    getOrBuildScopedBM25Index(docA, "1:1", ["doc-a"]);
    expect(getScopedBM25CacheBuildCount()).toBe(1);
  });

  it("does not share results across different scopes", () => {
    const scopedA = getOrBuildScopedBM25Index(docA, "1:2", ["doc-a"]);
    const scopedB = getOrBuildScopedBM25Index(docB, "1:2", ["doc-b"]);

    const hitA = scopedA.search("Clause 2.5", 3);
    const hitB = scopedB.search("Voltage drop", 3);

    expect(hitA[0]?.chunkId).toBe("a1");
    expect(hitB[0]?.chunkId).toBe("b1");
    expect(getScopedBM25CacheBuildCount()).toBe(2);
  });

  it("invalidates or bypasses stale cache after corpus signature change", () => {
    getOrBuildScopedBM25Index(both, "1:2", ["doc-a", "doc-b"]);
    expect(getScopedBM25CacheBuildCount()).toBe(1);

    // Simulate insert/delete bumping corpus signature.
    getOrBuildScopedBM25Index(both, "2:2", ["doc-a", "doc-b"]);
    expect(getScopedBM25CacheBuildCount()).toBe(2);
  });

  it("invalidateScopedBM25Cache forces a rebuild", () => {
    getOrBuildScopedBM25Index(docA, "1:1", ["doc-a"]);
    invalidateScopedBM25Cache();
    getOrBuildScopedBM25Index(docA, "1:1", ["doc-a"]);
    expect(getScopedBM25CacheBuildCount()).toBe(2);
  });

  it("returns the same search ranking as a fresh build", () => {
    const cached = getOrBuildScopedBM25Index(both, "9:2", ["doc-a", "doc-b"]);
    invalidateScopedBM25Cache();
    const fresh = getOrBuildScopedBM25Index(both, "9:2", ["doc-a", "doc-b"]);

    expect(cached.search("Clause residual", 5)).toEqual(
      fresh.search("Clause residual", 5),
    );
  });
});
