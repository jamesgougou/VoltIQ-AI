import type {
  MarkResult,
  StudyQuestion,
  StudyQuestionType,
} from "@/types/study";

export function canMarkDeterministically(type: StudyQuestionType): boolean {
  return type === "mcq" || type === "true-false";
}

export function normalizeObjectiveAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeTrueFalse(value: string): "true" | "false" | null {
  const normalized = normalizeObjectiveAnswer(value)
    .replace(/^\(+|\)+$/g, "")
    .trim();

  if (
    normalized === "true" ||
    normalized === "t" ||
    normalized === "yes" ||
    normalized === "y"
  ) {
    return "true";
  }

  if (
    normalized === "false" ||
    normalized === "f" ||
    normalized === "no" ||
    normalized === "n"
  ) {
    return "false";
  }

  return null;
}

function answersMatch(
  question: StudyQuestion,
  userAnswer: string,
): boolean {
  if (question.type === "true-false") {
    const expected = normalizeTrueFalse(question.correctAnswer);
    const actual = normalizeTrueFalse(userAnswer);
    if (expected && actual) {
      return expected === actual;
    }
  }

  const expected = normalizeObjectiveAnswer(question.correctAnswer);
  const actual = normalizeObjectiveAnswer(userAnswer);

  if (actual === expected) {
    return true;
  }

  // Allow matching the selected option text against correctAnswer.
  const options = question.options ?? [];
  const matchedOption = options.find(
    (option) => normalizeObjectiveAnswer(option) === actual,
  );

  if (matchedOption) {
    return normalizeObjectiveAnswer(matchedOption) === expected;
  }

  return false;
}

/**
 * Deterministic marking for MCQ / True-False.
 * Returns null for subjective types (caller should use LLM path).
 */
export function markObjectiveAnswer(
  question: StudyQuestion,
  userAnswer: string,
): MarkResult | null {
  if (!canMarkDeterministically(question.type)) {
    return null;
  }

  const correct = answersMatch(question, userAnswer);

  return {
    verdict: correct ? "correct" : "incorrect",
    score: correct ? 1 : 0,
    feedback: correct ? "Correct." : "Incorrect.",
    whyIncorrect: correct
      ? undefined
      : `Expected answer: ${question.correctAnswer}`,
    correctAnswer: question.correctAnswer,
    explanation: correct
      ? "Your answer matches the expected option from the study materials."
      : `The correct answer is ${question.correctAnswer}. Review the referenced sources for the requirement.`,
    sources: question.sources ?? [],
  };
}
