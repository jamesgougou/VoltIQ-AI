"use client";

import { CitationList } from "@/components/Citations";
import { citationsFromSources } from "@/lib/citations/fromSources";
import type { StudyReference } from "@/types/study";

type StudyReferencesProps = {
  sources: StudyReference[];
  messageId: string;
};

export function StudyReferences({ sources, messageId }: StudyReferencesProps) {
  const citations = citationsFromSources(sources).map((citation, index) => ({
    ...citation,
    index: index + 1,
  }));

  if (citations.length === 0) {
    return null;
  }

  return <CitationList citations={citations} messageId={messageId} />;
}
