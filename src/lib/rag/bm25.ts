import type { StoredDocumentChunk } from "@/lib/rag/types";

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export type BM25SearchResult = {
  chunkId: string;
  score: number;
};

type BM25Document = {
  chunkId: string;
  tokens: string[];
  length: number;
  /** Precomputed at index build — avoids recounting tokens on every query. */
  termFrequency: Map<string, number>;
};

function buildTermFrequency(tokens: string[]): Map<string, number> {
  const termFrequency = new Map<string, number>();

  for (const token of tokens) {
    termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
  }

  return termFrequency;
}

export class BM25Index {
  private documents: BM25Document[] = [];
  private documentFrequency = new Map<string, number>();
  private averageDocumentLength = 0;
  private chunkCount = 0;

  constructor(chunks: StoredDocumentChunk[]) {
    this.documents = chunks.map((chunk) => {
      const tokens = tokenize(chunk.text);
      return {
        chunkId: chunk.id,
        tokens,
        length: tokens.length,
        termFrequency: buildTermFrequency(tokens),
      };
    });

    this.chunkCount = this.documents.length;

    if (this.chunkCount === 0) {
      return;
    }

    this.averageDocumentLength =
      this.documents.reduce((sum, document) => sum + document.length, 0) /
      this.chunkCount;

    for (const document of this.documents) {
      const uniqueTokens = new Set(document.tokens);

      for (const token of uniqueTokens) {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) ?? 0) + 1,
        );
      }
    }
  }

  search(query: string, topK: number): BM25SearchResult[] {
    if (this.chunkCount === 0) {
      return [];
    }

    const queryTokens = tokenize(query);

    if (queryTokens.length === 0) {
      return [];
    }

    const scores = this.documents.map((document) => ({
      chunkId: document.chunkId,
      score: this.scoreDocument(document, queryTokens),
    }));

    return scores
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  private scoreDocument(document: BM25Document, queryTokens: string[]): number {
    let score = 0;

    for (const token of queryTokens) {
      const frequency = document.termFrequency.get(token) ?? 0;

      if (frequency === 0) {
        continue;
      }

      const documentFrequency = this.documentFrequency.get(token) ?? 0;
      const idf = Math.log(
        1 +
          (this.chunkCount - documentFrequency + 0.5) /
            (documentFrequency + 0.5),
      );
      const numerator = frequency * (BM25_K1 + 1);
      const denominator =
        frequency +
        BM25_K1 *
          (1 -
            BM25_B +
            (BM25_B * document.length) /
              Math.max(this.averageDocumentLength, 1));

      score += idf * (numerator / denominator);
    }

    return score;
  }
}

export function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokens: string[] = [];

  const patterns = [
    /\b(?:as\/nzs|asnzs)\s*\d+(?::\d+)?(?:\.\d+)*/gi,
    /\b(?:clause|cl\.|section|sec\.|table|figure|appendix)\s*[a-z0-9]+(?:\.\d+)*/gi,
    /\b\d+\.\d+(?:\.\d+)*/g,
    /\b[a-z0-9]+\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const token = match[0].trim().toLowerCase();

      if (token.length > 1) {
        tokens.push(token);
      }
    }
  }

  return [...new Set(tokens)];
}

export function normalizeScores(
  results: BM25SearchResult[],
): Map<string, number> {
  const normalized = new Map<string, number>();

  if (results.length === 0) {
    return normalized;
  }

  const maxScore = results[0]?.score ?? 0;

  if (maxScore <= 0) {
    return normalized;
  }

  for (const result of results) {
    normalized.set(result.chunkId, result.score / maxScore);
  }

  return normalized;
}

export function buildBM25Index(chunks: StoredDocumentChunk[]): BM25Index {
  return new BM25Index(chunks);
}
