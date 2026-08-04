import type { IndexedCitation } from "@/types/citation";
import { CitationCard } from "./CitationCard";

type CitationListProps = {
  citations: IndexedCitation[];
  messageId: string;
};

export function CitationList({ citations, messageId }: CitationListProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sources
      </h4>

      <div className="mt-2.5 space-y-2">
        {citations.map((citation) => (
          <CitationCard
            key={citation.id}
            citation={citation}
            messageId={messageId}
          />
        ))}
      </div>
    </div>
  );
}
