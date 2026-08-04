export type CitationConfidence = "High" | "Medium" | "Low";

export type Citation = {
  id: string;
  document: string;
  fileName: string;
  page: number;
  clause?: string;
  confidence: CitationConfidence;
  excerpt: string;
  inlineLabel: string;
};

export type IndexedCitation = Citation & {
  index: number;
};
