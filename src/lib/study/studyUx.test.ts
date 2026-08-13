import { describe, expect, it } from "vitest";
import {
  resumeNoticeLabel,
  shouldConfirmAbandonSession,
  shouldDisableStudyStartActions,
} from "./studyUx";
import type { StudySession } from "@/types/study";

const baseSession: StudySession = {
  id: "s1",
  mode: "quiz",
  difficulty: "electrician",
  documentIds: ["d1"],
  questions: [],
  index: 0,
  answers: [],
  startedAt: "2026-01-01T00:00:00.000Z",
};

describe("study polish helpers", () => {
  it("requires confirm only when quiz/exam has answers", () => {
    expect(shouldConfirmAbandonSession(baseSession)).toBe(false);
    expect(
      shouldConfirmAbandonSession({
        ...baseSession,
        answers: [
          {
            questionId: "q1",
            userAnswer: "A",
            result: {
              verdict: "correct",
              score: 1,
              feedback: "ok",
              correctAnswer: "A",
              explanation: "ok",
              sources: [],
            },
            answeredAt: "2026-01-01T00:01:00.000Z",
          },
        ],
      }),
    ).toBe(true);
  });

  it("labels resumed quiz/exam", () => {
    expect(resumeNoticeLabel({ ...baseSession, mode: "quiz" }, null)).toBe(
      "Resumed quiz",
    );
    expect(resumeNoticeLabel({ ...baseSession, mode: "exam" }, null)).toBe(
      "Resumed exam",
    );
  });

  it("disables start actions while loading", () => {
    expect(shouldDisableStudyStartActions(true)).toBe(true);
    expect(shouldDisableStudyStartActions(false)).toBe(false);
  });
});
