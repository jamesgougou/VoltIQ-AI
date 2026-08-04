"use client";

import { useMemo } from "react";
import { citationsFromSources } from "@/lib/citations/fromSources";
import type { RetrievedSourceMetadata } from "@/lib/rag/types";
import type { IndexedCitation } from "@/types/citation";
import { MarkdownContent } from "@/components/ChatPanel/MarkdownContent";
import { CitationBadge } from "./CitationBadge";
import { CitationList } from "./CitationList";
import { buildCitationSegments } from "./citationSegments";

type AssistantAnswerProps = {
  content: string;
  messageId: string;
  sources?: RetrievedSourceMetadata[];
};

function scrollToCitation(messageId: string, citationId: string) {
  const element = document.getElementById(`citation-${messageId}-${citationId}`);

  if (!element) {
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "center" });

  if (!element.classList.contains("ring-2")) {
    element.classList.add("ring-2", "ring-violet-300");
    window.setTimeout(() => {
      element.classList.remove("ring-2", "ring-violet-300");
    }, 1200);
  }
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
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 pt-3">
      {citations.map((citation) => (
        <CitationBadge
          key={citation.id}
          index={citation.index}
          onClick={() => scrollToCitation(messageId, citation.id)}
        />
      ))}
    </div>
  );
}

export function AssistantAnswer({
  content,
  messageId,
  sources,
}: AssistantAnswerProps) {
  const indexedCitations = useMemo<IndexedCitation[]>(() => {
    const citations = citationsFromSources(sources);

    return citations.map((citation, index) => ({
      ...citation,
      index: index + 1,
    }));
  }, [sources]);

  const segments = useMemo(
    () => buildCitationSegments(content, indexedCitations),
    [content, indexedCitations],
  );

  const hasCitations = indexedCitations.length > 0;
  const hasInlineSegments = segments.some((segment) => segment.type === "inline");

  if (!hasCitations) {
    return <MarkdownContent content={content} />;
  }

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
                key={`inline-${segment.citation.id}-${index}`}
                className="inline citation-inline-ref text-sm leading-relaxed text-slate-800"
              >
                {segment.label}
                <CitationBadge
                  index={segment.citation.index}
                  onClick={() => scrollToCitation(messageId, segment.citation.id)}
                />
              </span>
            );
          })}
        </div>
      ) : (
        <>
          <MarkdownContent content={content} />
          <InlineReferences citations={indexedCitations} messageId={messageId} />
        </>
      )}

      <CitationList citations={indexedCitations} messageId={messageId} />
    </div>
  );
}
