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
    description: "Create study questions from uploaded documents.",
    prompt: "Generate 20 study questions from my uploaded documents.",
    icon: "questions",
  },
  {
    id: "summarise",
    title: "Summarise",
    description: "Create a concise summary of uploaded documents.",
    prompt: "Summarise my uploaded documents.",
    icon: "summarise",
  },
  {
    id: "explain",
    title: "Explain",
    description: "Explain technical content in simple language.",
    prompt:
      "Explain the uploaded content in simple language suitable for an apprentice electrician.",
    icon: "explain",
  },
  {
    id: "find-standards",
    title: "Find Standards",
    description: "Find all AS/NZS standards referenced.",
    prompt: "List every AS/NZS standard referenced in my uploaded documents.",
    icon: "standards",
  },
  {
    id: "extract-tables",
    title: "Extract Tables",
    description: "Extract tables from uploaded documents.",
    prompt: "Extract all tables from my uploaded documents.",
    icon: "tables",
  },
];
