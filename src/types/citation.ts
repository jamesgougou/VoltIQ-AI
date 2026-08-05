export type CitationConfidence = "High" | "Medium" | "Low";

export type Citation = {
  id: string;
  documentId: string;
  document: string;
  fileName: string;
  page?: number;
  clause?: string;
  chunkIndex: number;
  similarityScore: number;
  confidence: CitationConfidence;
  excerpt: string;
  inlineLabel: string;
  unavailable?: boolean;
};

export type IndexedCitation = Citation & {
  index: number;
};
