import type { RetrievedSourceMetadata } from "@/lib/rag/types";
import type { Citation, CitationConfidence } from "@/types/citation";

const CLAUSE_PATTERN =
  /\b(?:Clause|Cl\.|Section|Sec\.)\s*(\d+(?:\.\d+)*)\b/i;

function similarityToConfidence(score: number): CitationConfidence {
  if (score >= 0.85) {
    return "High";
  }

  if (score >= 0.7) {
    return "Medium";
  }

  return "Low";
}

function extractClause(excerpt: string): string | undefined {
  const match = excerpt.match(CLAUSE_PATTERN);

  if (!match?.[1]) {
    return undefined;
  }

  return match[1];
}

function buildInlineLabel(excerpt: string, filename: string): string {
  const clause = extractClause(excerpt);

  if (clause) {
    return `Clause ${clause}`;
  }

  const sentence = excerpt.split(/(?<=[.!?])\s+/)[0]?.trim();

  if (sentence && sentence.length >= 16 && sentence.length <= 90) {
    return sentence;
  }

  const trimmed = excerpt.trim();

  if (trimmed.length >= 16) {
    return trimmed.length > 72 ? `${trimmed.slice(0, 72).trim()}…` : trimmed;
  }

  return filename.replace(/\.[^.]+$/, "");
}

function isValidSource(source: RetrievedSourceMetadata): boolean {
  return Boolean(
    source.chunkId?.trim() &&
      source.filename?.trim() &&
      typeof source.excerpt === "string" &&
      source.excerpt.trim().length > 0,
  );
}

export function citationsFromSources(
  sources: RetrievedSourceMetadata[] | undefined,
): Citation[] {
  if (!sources?.length) {
    return [];
  }

  return sources
    .slice()
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .map((source) => {
      if (!isValidSource(source)) {
        return {
          id: source.chunkId || crypto.randomUUID(),
          documentId: source.documentId || "",
          document: source.filename || "Unknown document",
          fileName: source.filename || "Unknown document",
          page: source.page,
          chunkIndex: source.chunkIndex,
          similarityScore: source.similarityScore,
          confidence: similarityToConfidence(source.similarityScore ?? 0),
          excerpt: "Source unavailable.",
          inlineLabel: "",
          unavailable: true,
        } satisfies Citation;
      }

      const excerpt = source.excerpt.trim();

      return {
        id: source.chunkId,
        documentId: source.documentId,
        document: source.filename,
        fileName: source.filename,
        page: source.page,
        clause: extractClause(excerpt),
        chunkIndex: source.chunkIndex,
        similarityScore: source.similarityScore,
        confidence: similarityToConfidence(source.similarityScore),
        excerpt,
        inlineLabel: buildInlineLabel(excerpt, source.filename),
        unavailable: false,
      } satisfies Citation;
    });
}
