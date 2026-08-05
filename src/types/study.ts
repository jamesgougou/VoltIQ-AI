import type { RetrievedSourceMetadata } from "@/lib/rag/types";

export type StudyDifficulty = "apprentice" | "electrician" | "inspector";

export type StudyQuestionType =
  | "mcq"
  | "short"
  | "true-false"
  | "scenario";

export type StudyModeId =
  | "quiz"
  | "flashcards"
  | "explain"
  | "exam"
  | "progress"
  | "history"
  | "idle";

export type StudyVerdict = "correct" | "partial" | "incorrect";

export type StudyReference = RetrievedSourceMetadata;

export type StudyQuestion = {
  id: string;
  type: StudyQuestionType;
  prompt: string;
  options?: string[];
  /** Model-held answer key — not shown until marked. */
  correctAnswer: string;
  topic: string;
  difficulty: StudyDifficulty;
  sources: StudyReference[];
};

export type StudyFlashcard = {
  id: string;
  front: string;
  back: string;
  topic: string;
  sources: StudyReference[];
  bookmarked?: boolean;
};

export type MarkResult = {
  verdict: StudyVerdict;
  score: 0 | 0.5 | 1;
  feedback: string;
  whyIncorrect?: string;
  correctAnswer: string;
  explanation: string;
  sources: StudyReference[];
};

export type StudyAnswerRecord = {
  questionId: string;
  userAnswer: string;
  result: MarkResult;
  answeredAt: string;
};

export type StudySession = {
  id: string;
  mode: "quiz" | "exam" | "flashcards";
  difficulty: StudyDifficulty;
  documentIds: string[];
  questions: StudyQuestion[];
  flashcards?: StudyFlashcard[];
  index: number;
  answers: StudyAnswerRecord[];
  startedAt: string;
  endedAt?: string;
  timed?: boolean;
  durationSeconds?: number;
  passMark?: number;
  focusTopics?: string[];
};

export type TopicStats = {
  attempts: number;
  correct: number;
  partial: number;
  incorrect: number;
};

export type StudyProgress = {
  questionsAnswered: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  studyTimeMs: number;
  scores: number[];
  topics: Record<string, TopicStats>;
  lastStudyAt?: string;
  bookmarks: string[];
  history: Array<{
    id: string;
    mode: StudySession["mode"];
    scorePercent: number;
    answered: number;
    at: string;
    difficulty: StudyDifficulty;
  }>;
};

export type GenerateStudyRequest = {
  mode: "quiz" | "exam" | "flashcards";
  difficulty: StudyDifficulty;
  count: number;
  documentIds: string[];
  focusTopics?: string[];
  questionTypes?: StudyQuestionType[];
};

export type GenerateStudyResponse = {
  questions?: StudyQuestion[];
  flashcards?: StudyFlashcard[];
};

export type MarkStudyRequest = {
  question: StudyQuestion;
  userAnswer: string;
  documentIds: string[];
};
