import { describe, expect, it } from "vitest";
import {
  clearActiveStudySession,
  isActiveStudyPersistable,
  parseActiveStudy,
  serializeActiveStudy,
} from "./sessionResume";
import {
  applyAnswerToProgressState,
  applySessionCompleteToProgressState,
} from "./progressUpdates";
import {
  EMPTY_STUDY_PROGRESS_FOR_TESTS,
  recordAnswerInProgress,
} from "./progressStorage";
import type { MarkResult, StudySession } from "@/types/study";

const baseSession: StudySession = {
  id: "session-1",
  mode: "quiz",
  difficulty: "electrician",
  documentIds: ["doc-a"],
  questions: [],
  index: 0,
  answers: [],
  startedAt: "2026-01-01T00:00:00.000Z",
};

describe("study session resume serialization", () => {
  it("serializes a new active session", () => {
    const payload = serializeActiveStudy({
      activeMode: "quiz",
      difficulty: "electrician",
      session: baseSession,
      examComplete: null,
    });
    expect(payload?.session?.id).toBe("session-1");
    expect(isActiveStudyPersistable("quiz", baseSession, null)).toBe(true);
  });

  it("does not persist idle/abandoned empty state", () => {
    expect(
      serializeActiveStudy({
        activeMode: "idle",
        difficulty: "electrician",
        session: null,
        examComplete: null,
      }),
    ).toBeNull();
  });

  it("rejects stale sessions", () => {
    const raw = JSON.stringify({
      version: 1,
      activeMode: "quiz",
      difficulty: "electrician",
      session: baseSession,
      examComplete: null,
      savedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(parseActiveStudy(raw, Date.parse("2026-01-01T00:00:00.000Z"))).toBeNull();
  });

  it("parses a fresh active session", () => {
    const payload = serializeActiveStudy({
      activeMode: "exam",
      difficulty: "inspector",
      session: { ...baseSession, mode: "exam" },
      examComplete: null,
      savedAt: "2026-01-01T12:00:00.000Z",
    });
    const parsed = parseActiveStudy(
      JSON.stringify(payload),
      Date.parse("2026-01-01T13:00:00.000Z"),
    );
    expect(parsed?.activeMode).toBe("exam");
  });

  it("clear helper is safe to call", () => {
    expect(() => clearActiveStudySession()).not.toThrow();
  });
});

describe("final progress update race", () => {
  const result: MarkResult = {
    verdict: "correct",
    score: 1,
    feedback: "Correct.",
    correctAnswer: "A",
    explanation: "ok",
    sources: [],
  };

  it("applies the final answer before session summary", () => {
    const initial = {
      ...EMPTY_STUDY_PROGRESS_FOR_TESTS,
      questionsAnswered: 0,
      correctCount: 0,
      scores: [],
      history: [],
      topics: {},
    };

    const afterAnswer = applyAnswerToProgressState(
      initial,
      "Protection",
      result,
      1000,
    );
    expect(afterAnswer.questionsAnswered).toBe(1);
    expect(afterAnswer.correctCount).toBe(1);

    const completedSession: StudySession = {
      ...baseSession,
      answers: [
        {
          questionId: "q1",
          userAnswer: "A",
          result,
          answeredAt: "2026-01-01T00:01:00.000Z",
        },
      ],
      endedAt: "2026-01-01T00:01:00.000Z",
    };

    const afterComplete = applySessionCompleteToProgressState(
      afterAnswer,
      completedSession,
    );
    expect(afterComplete.history).toHaveLength(1);
    expect(afterComplete.questionsAnswered).toBe(1);
    expect(afterComplete.correctCount).toBe(1);
  });

  it("recordAnswerInProgress remains pure for composition", () => {
    const first = recordAnswerInProgress(
      EMPTY_STUDY_PROGRESS_FOR_TESTS,
      "Topic",
      result,
      10,
    );
    const second = recordAnswerInProgress(first, "Topic", result, 10);
    expect(second.questionsAnswered).toBe(2);
  });
});
