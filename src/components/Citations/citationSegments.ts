import type { IndexedCitation } from "@/types/citation";

export type CitationSegment =
  | { type: "markdown"; text: string }
  | { type: "inline"; label: string; citation: IndexedCitation };

type MatchCandidate = {
  citation: IndexedCitation;
  position: number;
  length: number;
};

function findMatch(
  content: string,
  label: string,
): { position: number; length: number } | null {
  const normalizedContent = content.toLowerCase();
  const normalizedLabel = label.toLowerCase().trim();

  if (!normalizedLabel) {
    return null;
  }

  const position = normalizedContent.indexOf(normalizedLabel);

  if (position === -1) {
    return null;
  }

  return {
    position,
    length: label.length,
  };
}

function buildMatchCandidates(
  content: string,
  citations: IndexedCitation[],
): MatchCandidate[] {
  const matches: MatchCandidate[] = [];

  for (const citation of citations) {
    if (citation.unavailable || !citation.inlineLabel.trim()) {
      continue;
    }

    const labels = [citation.inlineLabel];

    if (citation.clause) {
      labels.push(`Clause ${citation.clause}`);
    }

    for (const label of labels) {
      const match = findMatch(content, label);

      if (!match) {
        continue;
      }

      matches.push({
        citation,
        position: match.position,
        length: label.length,
      });
      break;
    }
  }

  return matches.sort((left, right) => left.position - right.position);
}

export function buildCitationSegments(
  content: string,
  citations: IndexedCitation[],
): CitationSegment[] {
  if (citations.length === 0) {
    return [{ type: "markdown", text: content }];
  }

  const matches = buildMatchCandidates(content, citations);

  if (matches.length === 0) {
    return [{ type: "markdown", text: content }];
  }

  const segments: CitationSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.position < cursor) {
      continue;
    }

    if (match.position > cursor) {
      segments.push({
        type: "markdown",
        text: content.slice(cursor, match.position),
      });
    }

    segments.push({
      type: "inline",
      label: content.slice(match.position, match.position + match.length),
      citation: match.citation,
    });

    cursor = match.position + match.length;
  }

  if (cursor < content.length) {
    segments.push({
      type: "markdown",
      text: content.slice(cursor),
    });
  }

  return segments;
}
