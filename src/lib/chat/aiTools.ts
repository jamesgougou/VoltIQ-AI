export type AITool = {
  id: string;
  label: string;
  prompt: string;
};

export const AI_TOOLS: AITool[] = [
  {
    id: "generate-questions",
    label: "Generate Questions",
    prompt: "Generate 20 study questions from my uploaded documents.",
  },
  {
    id: "summarise",
    label: "Summarise",
    prompt: "Summarise my uploaded documents.",
  },
  {
    id: "explain",
    label: "Explain",
    prompt:
      "Explain the uploaded content in simple language suitable for an apprentice electrician.",
  },
  {
    id: "find-standards",
    label: "Find Standards",
    prompt: "List every AS/NZS standard referenced in my uploaded documents.",
  },
  {
    id: "extract-tables",
    label: "Extract Tables",
    prompt: "Extract all tables from my uploaded documents.",
  },
];
