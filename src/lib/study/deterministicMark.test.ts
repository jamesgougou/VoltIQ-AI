import { describe, expect, it, vi } from "vitest";
import { markObjectiveAnswer } from "./deterministicMark";
import { markStudyMaterial } from "./client";
import type { StudyQuestion } from "@/types/study";

function mcq(correctAnswer: string): StudyQuestion {
  return {
    id: "q1",
    type: "mcq",
    prompt: "What does RCD stand for?",
    options: [
      "Residual Current Device",
      "Remote Control Device",
      "Rated Current Diode",
    ],
    correctAnswer,
    topic: "Protection",
    difficulty: "electrician",
    sources: [
      {
        filename: "AS3000.pdf",
        documentId: "11111111-1111-4111-8111-111111111111",
        page: 10,
        chunkIndex: 0,
        similarityScore: 0.9,
        chunkId: "c1",
        excerpt: "RCD requirements",
      },
    ],
  };
}

function trueFalse(correctAnswer: string): StudyQuestion {
  return {
    id: "q2",
    type: "true-false",
    prompt: "An RCD detects earth leakage current.",
    options: ["True", "False"],
    correctAnswer,
    topic: "Protection",
    difficulty: "apprentice",
    sources: [],
  };
}

describe("deterministic objective marking", () => {
  it("marks a correct MCQ", () => {
    const result = markObjectiveAnswer(
      mcq("Residual Current Device"),
      "Residual Current Device",
    );
    expect(result?.verdict).toBe("correct");
    expect(result?.score).toBe(1);
    expect(result?.sources).toHaveLength(1);
  });

  it("marks an incorrect MCQ", () => {
    const result = markObjectiveAnswer(
      mcq("Residual Current Device"),
      "Remote Control Device",
    );
    expect(result?.verdict).toBe("incorrect");
    expect(result?.score).toBe(0);
    expect(result?.correctAnswer).toBe("Residual Current Device");
  });

  it("marks True/False correct with normalization", () => {
    const result = markObjectiveAnswer(trueFalse("True"), "yes");
    expect(result?.verdict).toBe("correct");
  });

  it("marks True/False incorrect", () => {
    const result = markObjectiveAnswer(trueFalse("True"), "False");
    expect(result?.verdict).toBe("incorrect");
  });

  it("normalizes MCQ whitespace/case", () => {
    const result = markObjectiveAnswer(
      mcq("Residual Current Device"),
      "  residual   current device ",
    );
    expect(result?.verdict).toBe("correct");
  });

  it("does not deterministically mark subjective answers", () => {
    const shortQuestion: StudyQuestion = {
      ...mcq("anything"),
      type: "short",
      options: undefined,
      correctAnswer: "A short expected answer",
    };
    expect(markObjectiveAnswer(shortQuestion, "A short expected answer")).toBeNull();
  });
});

describe("markStudyMaterial routing", () => {
  it("uses deterministic path for MCQ and does not call the LLM API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await markStudyMaterial({
      question: mcq("Residual Current Device"),
      userAnswer: "Residual Current Device",
      documentIds: ["11111111-1111-4111-8111-111111111111"],
    });
    expect(result.verdict).toBe("correct");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("uses the LLM path for subjective answers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          verdict: "partial",
          score: 0.5,
          feedback: "Partially correct.",
          correctAnswer: "Expected",
          explanation: "More detail needed.",
          sources: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await markStudyMaterial({
      question: {
        id: "s1",
        type: "short",
        prompt: "Explain MEN.",
        correctAnswer: "Multiple Earthed Neutral",
        topic: "Earthing",
        difficulty: "electrician",
        sources: [],
      },
      userAnswer: "Neutral earthed in multiple places",
      documentIds: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.verdict).toBe("partial");
    fetchSpy.mockRestore();
  });
});
