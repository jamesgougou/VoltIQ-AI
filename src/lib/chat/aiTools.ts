export type AIToolIcon =
  | "questions"
  | "summarise"
  | "explain"
  | "standards"
  | "tables";

export type AITool = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: AIToolIcon;
};

export const AI_TOOLS: AITool[] = [
  {
    id: "generate-questions",
    title: "Generate Questions",
    description: "Open Study Mode to create an interactive quiz from your documents.",
    // Prompt unused — this tool deep-links into Study Mode (single source of truth).
    prompt: "",
    icon: "questions",
  },
  {
    id: "summarise",
    title: "Summarise",
    description: "Create a concise summary of uploaded documents.",
    prompt:
      "Summarise my uploaded documents for electrical inspection and study use. Focus on key requirements, definitions, and practical points that appear in the documents. Do not add standards or clauses that are not present.",
    icon: "summarise",
  },
  {
    id: "explain",
    title: "Explain",
    description: "Explain technical content in simple language.",
    prompt:
      "Explain the uploaded content in simple language suitable for an apprentice electrician. Stay grounded in the uploaded documents. If you add context beyond the documents, label it as General knowledge.",
    icon: "explain",
  },
  {
    id: "find-standards",
    title: "Find Standards",
    description: "Find AS/NZS standards referenced in uploads.",
    prompt:
      "Using only my uploaded documents, list every AS/NZS standard, clause, section, and table reference that appears. Structure the response as Answer, Requirement / Finding, Explanation, Practical application, and Source / Page. Include clause or section numbers only when they appear in the documents. If a standard or clause is not present, say so clearly and do not invent it.",
    icon: "standards",
  },
  {
    id: "extract-tables",
    title: "Extract Tables",
    description: "Extract tables from uploaded documents.",
    prompt:
      "Extract all tables from my uploaded documents that are relevant to electrical work (for example cable sizing, demand, protection, or testing). Quote table content only as it appears in the documents.",
    icon: "tables",
  },
];
