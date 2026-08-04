export type StudyToolIcon =
  | "questions"
  | "flashcards"
  | "explain"
  | "exam";

export type StudyTool = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: StudyToolIcon;
};

export const STUDY_TOOLS: StudyTool[] = [
  {
    id: "generate-questions",
    title: "Generate Questions",
    description: "Create study questions from your uploaded documents.",
    prompt: "Generate 20 study questions from my uploaded documents.",
    icon: "questions",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Build flashcards from key terms and definitions.",
    prompt:
      "Create flashcards from key terms and definitions in my uploaded documents.",
    icon: "flashcards",
  },
  {
    id: "explain-simply",
    title: "Explain Simply",
    description: "Get apprentice-friendly explanations of technical content.",
    prompt:
      "Explain the uploaded content in simple language suitable for an apprentice electrician.",
    icon: "explain",
  },
  {
    id: "exam-mode",
    title: "Exam Mode",
    description: "Generate a mock exam from your uploaded material.",
    prompt:
      "Create a mock exam with 10 multiple-choice questions based on my uploaded documents.",
    icon: "exam",
  },
];
