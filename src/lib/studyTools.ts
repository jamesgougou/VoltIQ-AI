import type { StudyModeId } from "@/types/study";

export type StudyToolIcon =
  | "questions"
  | "flashcards"
  | "explain"
  | "exam"
  | "progress"
  | "history";

export type StudyTool = {
  id: StudyModeId;
  title: string;
  description: string;
  icon: StudyToolIcon;
};

export const STUDY_TOOLS: StudyTool[] = [
  {
    id: "quiz",
    title: "Generate Questions",
    description: "Interactive quiz with instant marking and explanations.",
    icon: "questions",
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Flip, shuffle and bookmark cards from your documents.",
    icon: "flashcards",
  },
  {
    id: "explain",
    title: "Explain Simply",
    description: "Apprentice-friendly lessons grounded in your library.",
    icon: "explain",
  },
  {
    id: "exam",
    title: "Exam Mode",
    description: "Timed or untimed mock exams with scoring and review.",
    icon: "exam",
  },
  {
    id: "progress",
    title: "Progress",
    description: "Track scores, study time and weak topics.",
    icon: "progress",
  },
  {
    id: "history",
    title: "Study History",
    description: "Review recent quiz and exam sessions.",
    icon: "history",
  },
];
