"use client";

import { useMemo } from "react";
import { getMockCitationsForContent } from "@/lib/citations/mockCitations";
import type { IndexedCitation } from "@/types/citation";
import { MarkdownContent } from "@/components/ChatPanel/MarkdownContent";
import { CitationBadge } from "./CitationBadge";
import { CitationList } from "./CitationList";
import { buildCitationSegments } from "./citationSegments";

type AssistantAnswerProps = {
  content: string;
  messageId: string;
};

function scrollToCitation(messageId: string, citationId: string) {
  const element = document.getElementById(`citation-${messageId}-${citationId}`);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function InlineReferences({
  citations,
  messageId,
}: {
  citations: IndexedCitation[];
  messageId: string;
}) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-3">
      <span className="text-[11px] font-medium text-slate-400">Referenced</span>
      {citations.map((citation) => (
        <CitationBadge
          key={citation.id}
          index={citation.index}
          label={citation.inlineLabel}
          onClick={() => scrollToCitation(messageId, citation.id)}
        />
      ))}
    </div>
  );
}

export function AssistantAnswer({ content, messageId }: AssistantAnswerProps) {
  const citations = useMemo(
    () => getMockCitationsForContent(content),
    [content],
  );

  const indexedCitations = useMemo<IndexedCitation[]>(
    () => citations.map((citation, index) => ({ ...citation, index: index + 1 })),
    [citations],
  );

  const segments = useMemo(
    () => buildCitationSegments(content, indexedCitations),
    [content, indexedCitations],
  );

  if (indexedCitations.length === 0) {
    return <MarkdownContent content={content} />;
  }

  const hasInlineSegments = segments.some((segment) => segment.type === "inline");

  return (
    <div>
      {hasInlineSegments ? (
        <div className="citation-aware-answer space-y-0">
          {segments.map((segment, index) => {
            if (segment.type === "markdown") {
              if (!segment.text.trim()) {
                return null;
              }

              return (
                <MarkdownContent
                  key={`md-${index}`}
                  content={segment.text}
                  className="citation-segment"
                />
              );
            }

            return (
              <span
                key={`inline-${segment.citation.id}`}
                className="inline citation-inline-ref text-sm leading-relaxed text-slate-800"
              >
                {segment.label}
                <CitationBadge
                  index={segment.citation.index}
                  onClick={() =>
                    scrollToCitation(messageId, segment.citation.id)
                  }
                />
              </span>
            );
          })}
        </div>
      ) : (
        <>
          <MarkdownContent content={content} />
          <InlineReferences
            citations={indexedCitations}
            messageId={messageId}
          />
        </>
      )}

      <CitationList citations={indexedCitations} messageId={messageId} />
    </div>
  );
}
