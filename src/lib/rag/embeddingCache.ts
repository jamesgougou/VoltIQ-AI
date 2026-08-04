import { embedQuery as embedQueryUncached } from "@/lib/rag/embed";

const MAX_CACHE_ENTRIES = 64;

type CacheEntry = {
  embedding: number[];
  accessedAt: number;
};

const cache = new Map<string, CacheEntry>();

function normalizeCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function evictOldestEntry() {
  let oldestKey: string | null = null;
  let oldestAccess = Number.POSITIVE_INFINITY;

  for (const [key, entry] of cache.entries()) {
    if (entry.accessedAt < oldestAccess) {
      oldestAccess = entry.accessedAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
  }
}

export async function embedQueryCached(query: string): Promise<number[]> {
  const cacheKey = normalizeCacheKey(query);
  const existing = cache.get(cacheKey);

  if (existing) {
    existing.accessedAt = Date.now();
    return existing.embedding;
  }

  const embedding = await embedQueryUncached(query);

  if (cache.size >= MAX_CACHE_ENTRIES) {
    evictOldestEntry();
  }

  cache.set(cacheKey, {
    embedding,
    accessedAt: Date.now(),
  });

  return embedding;
}

export function clearEmbeddingCache(): void {
  cache.clear();
}
