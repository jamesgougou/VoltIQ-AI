export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
  sources?: import("@/lib/rag/types").RetrievedSourceMetadata[];
};
