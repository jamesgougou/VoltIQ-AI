import type { CalcResult } from "@/lib/calculators";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
  sources?: import("@/lib/rag/types").RetrievedSourceMetadata[];
  /** Deterministic calculator payload — separate from RAG answers. */
  calculation?: CalcResult;
};
