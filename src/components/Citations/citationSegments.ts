import type { IndexedCitation } from "@/types/citation";

export type CitationSegment =
  | { type: "markdown"; text: string }
  | { type: "inline"; label: string; citation: IndexedCitation };

export function buildCitationSegments(
  content: string,
  citations: IndexedCitation[],
): CitationSegment[] {
  if (citations.length === 0) {
    return [{ type: "markdown", text: content }];
  }

  const matches = citations
    .map((citation) => {
      const position = content
        .toLowerCase()
        .indexOf(citation.inlineLabel.toLowerCase());

      if (position === -1) {
        return null;
      }

      return {
        citation,
        position,
        length: citation.inlineLabel.length,
      };
    })
    .filter(
      (
        match,
      ): match is {
        citation: IndexedCitation;
        position: number;
        length: number;
      } => match !== null,
    )
    .sort((a, b) => a.position - b.position);

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
