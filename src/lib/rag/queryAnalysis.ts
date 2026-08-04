const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  RCD: "Residual Current Device",
  RCBO: "Residual Current Breaker with Overcurrent Protection",
  MEN: "Multiple Earthed Neutral",
  MCB: "Miniature Circuit Breaker",
};

export type QueryIntent = "keyword-heavy" | "semantic-heavy" | "balanced";

export type ExactMatchTarget = {
  type: "clause" | "table" | "figure" | "appendix" | "standard";
  label: string;
  searchTerms: string[];
};

export type QueryProfile = {
  originalQuery: string;
  expandedQuery: string;
  intent: QueryIntent;
  semanticWeight: number;
  keywordWeight: number;
  exactMatches: ExactMatchTarget[];
};

const CLAUSE_PATTERN =
  /\b(?:clause|cl\.|section|sec\.)\s*(\d+(?:\.\d+)*)\b/gi;
const TABLE_PATTERN = /\btable\s*(\d+(?:\.\d+)*)\b/gi;
const FIGURE_PATTERN = /\bfigure\s*(\d+(?:\.\d+)*)\b/gi;
const APPENDIX_PATTERN = /\bappendix\s*([a-z0-9]+)\b/gi;
const STANDARD_PATTERN =
  /\b(?:as\/nzs|asnzs|as)\s*(\d+(?:\.\d+)*(?::\d+)?|\d+)\b/gi;
const BARE_CLAUSE_PATTERN = /\b(\d+\.\d+(?:\.\d+)*)\b/g;

function collectMatches(
  pattern: RegExp,
  text: string,
  type: ExactMatchTarget["type"],
  prefix: string,
): ExactMatchTarget[] {
  const matches: ExactMatchTarget[] = [];
  const regex = new RegExp(pattern.source, pattern.flags);

  for (const match of text.matchAll(regex)) {
    const value = match[1]?.trim();

    if (!value) {
      continue;
    }

    const label = `${prefix} ${value}`;
    matches.push({
      type,
      label,
      searchTerms: [
        label.toLowerCase(),
        `${prefix.toLowerCase()} ${value}`.toLowerCase(),
        value.toLowerCase(),
      ],
    });
  }

  return matches;
}

function detectExactMatches(query: string): ExactMatchTarget[] {
  const matches = [
    ...collectMatches(CLAUSE_PATTERN, query, "clause", "Clause"),
    ...collectMatches(TABLE_PATTERN, query, "table", "Table"),
    ...collectMatches(FIGURE_PATTERN, query, "figure", "Figure"),
    ...collectMatches(APPENDIX_PATTERN, query, "appendix", "Appendix"),
    ...collectMatches(STANDARD_PATTERN, query, "standard", "AS/NZS"),
  ];

  if (matches.length > 0) {
    return dedupeExactMatches(matches);
  }

  if (/\bclause\b/i.test(query)) {
    for (const match of query.matchAll(BARE_CLAUSE_PATTERN)) {
      const value = match[1];

      if (!value) {
        continue;
      }

      matches.push({
        type: "clause",
        label: `Clause ${value}`,
        searchTerms: [
          `clause ${value}`.toLowerCase(),
          value.toLowerCase(),
        ],
      });
    }
  }

  return dedupeExactMatches(matches);
}

function dedupeExactMatches(matches: ExactMatchTarget[]): ExactMatchTarget[] {
  const seen = new Set<string>();

  return matches.filter((match) => {
    const key = `${match.type}:${match.label}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function expandAbbreviations(query: string): string {
  let expanded = query;

  for (const [abbreviation, fullTerm] of Object.entries(
    ABBREVIATION_EXPANSIONS,
  )) {
    const pattern = new RegExp(`\\b${abbreviation}\\b`, "i");

    if (pattern.test(query)) {
      expanded += ` ${fullTerm}`;
    }
  }

  return expanded.trim();
}

function detectIntent(
  query: string,
  exactMatches: ExactMatchTarget[],
): QueryIntent {
  if (exactMatches.length > 0) {
    return "keyword-heavy";
  }

  const semanticPatterns =
    /^(what is|what are|explain|describe|how does|how do|why does|tell me about)\b/i;

  if (semanticPatterns.test(query.trim())) {
    return "semantic-heavy";
  }

  if (/\b(rcd|rcbo|men|mcb)\b/i.test(query)) {
    return "semantic-heavy";
  }

  return "balanced";
}

function weightsForIntent(intent: QueryIntent): {
  semanticWeight: number;
  keywordWeight: number;
} {
  switch (intent) {
    case "keyword-heavy":
      return { semanticWeight: 0.3, keywordWeight: 0.7 };
    case "semantic-heavy":
      return { semanticWeight: 0.85, keywordWeight: 0.15 };
    default:
      return { semanticWeight: 0.7, keywordWeight: 0.3 };
  }
}

export function analyzeQuery(query: string): QueryProfile {
  const originalQuery = query.trim();
  const exactMatches = detectExactMatches(originalQuery);
  const intent = detectIntent(originalQuery, exactMatches);
  const { semanticWeight, keywordWeight } = weightsForIntent(intent);
  const expandedQuery = expandAbbreviations(originalQuery);

  return {
    originalQuery,
    expandedQuery,
    intent,
    semanticWeight,
    keywordWeight,
    exactMatches,
  };
}

export function chunkContainsExactMatch(
  chunkText: string,
  target: ExactMatchTarget,
): boolean {
  const normalized = chunkText.toLowerCase();

  return target.searchTerms.some((term) => normalized.includes(term));
}

export function scoreExactMatches(
  chunkText: string,
  exactMatches: ExactMatchTarget[],
): number {
  if (exactMatches.length === 0) {
    return 0;
  }

  let score = 0;

  for (const target of exactMatches) {
    if (chunkContainsExactMatch(chunkText, target)) {
      score += target.type === "clause" ? 1 : 0.75;
    }
  }

  return Math.min(score / exactMatches.length, 1);
}
