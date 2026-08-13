import { buildBM25Index, type BM25Index } from "@/lib/rag/bm25";
import type { StoredDocumentChunk } from "@/lib/rag/types";

type CacheEntry = {
  corpusSignature: string;
  scopeKey: string;
  index: BM25Index;
};

let cacheEntry: CacheEntry | null = null;
let buildCount = 0;

function toScopeKey(scopeDocumentIds: Iterable<string>): string {
  return [...scopeDocumentIds].sort().join("\0");
}

export function invalidateScopedBM25Cache(): void {
  cacheEntry = null;
}

/** Test helper — number of BM25 builds since last reset. */
export function getScopedBM25CacheBuildCount(): number {
  return buildCount;
}

/** Test helper */
export function resetScopedBM25CacheForTests(): void {
  cacheEntry = null;
  buildCount = 0;
}

/**
 * Reuse a BM25 index for the same corpus revision + sorted eligible document IDs.
 * Do not use the full-corpus store cache — disabled docs must stay out of scoped IDF.
 */
export function getOrBuildScopedBM25Index(
  chunks: StoredDocumentChunk[],
  corpusSignature: string,
  scopeDocumentIds: Iterable<string>,
): BM25Index {
  const scopeKey = toScopeKey(scopeDocumentIds);

  if (
    cacheEntry &&
    cacheEntry.corpusSignature === corpusSignature &&
    cacheEntry.scopeKey === scopeKey
  ) {
    return cacheEntry.index;
  }

  buildCount += 1;
  const index = buildBM25Index(chunks);
  cacheEntry = {
    corpusSignature,
    scopeKey,
    index,
  };
  return index;
}
