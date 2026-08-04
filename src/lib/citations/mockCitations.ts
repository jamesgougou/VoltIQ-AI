import type { Citation } from "@/types/citation";

export function getMockCitationsForContent(_content: string): Citation[] {
  // Citations disabled until Sprint 4.2 (RAG + page-level references).
  return [];
}
