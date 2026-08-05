import { normalizeScores } from "@/lib/rag/bm25";
import { embedQueryCached } from "@/lib/rag/embeddingCache";
import { ragDebug, ragLog } from "@/lib/rag/logger";
import {
  analyzeQuery,
  scoreExactMatches,
  type QueryProfile,
} from "@/lib/rag/queryAnalysis";
import { getVectorStore } from "@/lib/rag/store";
import type { RetrievedChunk, StoredDocumentChunk } from "@/lib/rag/types";
import { TOP_K_CHUNKS } from "@/lib/rag/types";

export const MIN_RETRIEVAL_CONFIDENCE = 0.32;
const EXACT_MATCH_BOOST = 0.35;
const CANDIDATE_POOL_SIZE = 24;

export type HybridRetrievalResult = {
  chunks: RetrievedChunk[];
  insufficientRetrieval: boolean;
  profile: QueryProfile;
};

type ScoredCandidate = {
  chunk: StoredDocumentChunk;
  semanticScore: number;
  keywordScore: number;
  exactMatchScore: number;
  fusedScore: number;
};

function fuseScores(
  semanticScore: number,
  keywordScore: number,
  exactMatchScore: number,
  profile: QueryProfile,
): number {
  const baseScore =
    profile.semanticWeight * semanticScore +
    profile.keywordWeight * keywordScore;

  return Math.min(baseScore + exactMatchScore * EXACT_MATCH_BOOST, 1);
}

function buildCandidates(
  chunks: StoredDocumentChunk[],
  semanticResults: RetrievedChunk[],
  keywordScores: Map<string, number>,
  profile: QueryProfile,
): ScoredCandidate[] {
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const candidateIds = new Set<string>();

  for (const result of semanticResults) {
    candidateIds.add(result.id);
  }

  for (const chunkId of keywordScores.keys()) {
    candidateIds.add(chunkId);
  }

  const candidates: ScoredCandidate[] = [];

  for (const chunkId of candidateIds) {
    const chunk = chunkById.get(chunkId);

    if (!chunk) {
      continue;
    }

    const semanticScore =
      semanticResults.find((result) => result.id === chunkId)?.similarityScore ??
      0;
    const keywordScore = keywordScores.get(chunkId) ?? 0;
    const exactMatchScore = scoreExactMatches(chunk.text, profile.exactMatches);
    const fusedScore = fuseScores(
      semanticScore,
      keywordScore,
      exactMatchScore,
      profile,
    );

    candidates.push({
      chunk,
      semanticScore,
      keywordScore,
      exactMatchScore,
      fusedScore,
    });
  }

  return candidates.sort((left, right) => {
    if (right.fusedScore !== left.fusedScore) {
      return right.fusedScore - left.fusedScore;
    }

    if (right.exactMatchScore !== left.exactMatchScore) {
      return right.exactMatchScore - left.exactMatchScore;
    }

    if (right.keywordScore !== left.keywordScore) {
      return right.keywordScore - left.keywordScore;
    }

    return right.semanticScore - left.semanticScore;
  });
}

export type HybridRetrieveOptions = {
  /** When set, only chunks from these document IDs are searched. */
  documentIds?: string[];
};

export async function hybridRetrieve(
  query: string,
  topK = TOP_K_CHUNKS,
  options?: HybridRetrieveOptions,
): Promise<HybridRetrievalResult> {
  const trimmedQuery = query.trim();
  const profile = analyzeQuery(trimmedQuery);

  if (!trimmedQuery) {
    return {
      chunks: [],
      insufficientRetrieval: false,
      profile,
    };
  }

  const vectorStore = getVectorStore();
  const indexed = await vectorStore.hasIndexedContent();

  if (!indexed) {
    return {
      chunks: [],
      insufficientRetrieval: false,
      profile,
    };
  }

  // undefined = all enabled docs; [] = search nothing; [ids] = scoped search.
  const hasExplicitScope = Array.isArray(options?.documentIds);
  const allowedIds = hasExplicitScope
    ? new Set(options!.documentIds)
    : null;

  // Exclude disabled documents when no explicit ID list is provided.
  const records = await vectorStore.listDocumentRecords();
  const enabledIds = new Set(
    records
      .filter((record) => record.enabled !== false)
      .map((record) => record.documentId),
  );

  if (hasExplicitScope && allowedIds!.size === 0) {
    return {
      chunks: [],
      insufficientRetrieval: true,
      profile,
    };
  }

  const allChunks = (await vectorStore.getAllChunks()).filter((chunk) => {
    if (!enabledIds.has(chunk.documentId)) {
      return false;
    }

    if (allowedIds) {
      return allowedIds.has(chunk.documentId);
    }

    return true;
  });

  if (allChunks.length === 0) {
    return {
      chunks: [],
      insufficientRetrieval: true,
      profile,
    };
  }

  const queryEmbedding = await embedQueryCached(profile.expandedQuery);
  const semanticResults = (
    await vectorStore.similaritySearch(queryEmbedding, CANDIDATE_POOL_SIZE)
  ).filter((result) => {
    if (!enabledIds.has(result.documentId)) {
      return false;
    }

    if (allowedIds) {
      return allowedIds.has(result.documentId);
    }

    return true;
  });

  const { buildBM25Index } = await import("@/lib/rag/bm25");
  const scopedBm25 = buildBM25Index(allChunks);
  const keywordResults = scopedBm25.search(
    profile.expandedQuery,
    CANDIDATE_POOL_SIZE,
  );
  const keywordScores = normalizeScores(keywordResults);
  const candidates = buildCandidates(
    allChunks,
    semanticResults,
    keywordScores,
    profile,
  );

  const topCandidates = candidates.slice(0, topK);
  const bestScore = topCandidates[0]?.fusedScore ?? 0;
  const hasExactMatch = topCandidates.some(
    (candidate) => candidate.exactMatchScore > 0,
  );
  const insufficientRetrieval =
    topCandidates.length === 0 ||
    (bestScore < MIN_RETRIEVAL_CONFIDENCE && !hasExactMatch);

  ragLog(
    "retrieve",
    `Hybrid retrieval (${profile.intent}): ${topCandidates.length} candidate(s), best=${bestScore.toFixed(3)}, exact=${hasExactMatch}.`,
  );
  ragDebug("Hybrid retrieval profile", {
    intent: profile.intent,
    semanticWeight: profile.semanticWeight,
    keywordWeight: profile.keywordWeight,
    exactMatches: profile.exactMatches.map((match) => match.label),
    topScore: bestScore,
    insufficientRetrieval,
  });

  if (insufficientRetrieval) {
    return {
      chunks: [],
      insufficientRetrieval: true,
      profile,
    };
  }

  const chunks: RetrievedChunk[] = topCandidates.map((candidate) => ({
    id: candidate.chunk.id,
    documentId: candidate.chunk.documentId,
    filename: candidate.chunk.filename,
    page: candidate.chunk.page,
    chunkIndex: candidate.chunk.chunkIndex,
    text: candidate.chunk.text,
    similarityScore: candidate.fusedScore,
  }));

  return {
    chunks,
    insufficientRetrieval: false,
    profile,
  };
}
