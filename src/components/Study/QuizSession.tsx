"use client";

import { useEffect, useMemo, useState } from "react";
import { markStudyMaterial } from "@/lib/study/client";
import type {
  MarkResult,
  StudyDifficulty,
  StudyQuestion,
  StudySession,
} from "@/types/study";
import { FollowUpActions } from "./FollowUpActions";
import { StudyReferences } from "./StudyReferences";

type QuizSessionProps = {
  session: StudySession;
  onSessionChange: (session: StudySession) => void;
  onAnswered: (question: StudyQuestion, result: MarkResult, elapsedMs: number) => void;
  onComplete: (session: StudySession) => void;
  onFollowUp: (action: FollowUpAction, question: StudyQuestion) => void;
  onClose: () => void;
};

export type FollowUpAction =
  | "practice"
  | "harder"
  | "easier"
  | "explain"
  | "example";

function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}

export function QuizSession({
  session,
  onSessionChange,
  onAnswered,
  onComplete,
  onFollowUp,
  onClose,
}: QuizSessionProps) {
  const question = session.questions[session.index];
  const existing = session.answers.find(
    (answer) => answer.questionId === question?.id,
  );
  const [draft, setDraft] = useState("");
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [remaining, setRemaining] = useState<number | null>(() => {
    if (!session.timed || !session.durationSeconds) {
      return null;
    }

    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(session.startedAt).getTime()) / 1000,
    );
    return Math.max(0, session.durationSeconds - elapsedSeconds);
  });

  useEffect(() => {
    if (!session.timed || !session.durationSeconds) {
      return;
    }

    const timer = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000,
      );
      const left = Math.max(0, session.durationSeconds! - elapsed);
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(timer);
        onComplete({ ...session, endedAt: new Date().toISOString() });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session, onComplete]);

  const progressLabel = useMemo(() => {
    if (!question) return "";
    return `Question ${session.index + 1} / ${session.questions.length}`;
  }, [question, session.index, session.questions.length]);

  if (!question) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">No questions in this session.</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs"
        >
          Close
        </button>
      </div>
    );
  }

  async function submitAnswer(value: string) {
    const answer = value.trim();
    if (!answer || marking || existing) {
      return;
    }

    setMarking(true);
    setError(null);

    try {
      const result = await markStudyMaterial({
        question,
        userAnswer: answer,
        documentIds: session.documentIds,
      });

      const nextSession: StudySession = {
        ...session,
        answers: [
          ...session.answers,
          {
            questionId: question.id,
            userAnswer: answer,
            result,
            answeredAt: new Date().toISOString(),
          },
        ],
      };

      onSessionChange(nextSession);
      onAnswered(question, result, elapsedSince(startedAt));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to mark this answer.",
      );
    } finally {
      setMarking(false);
    }
  }

  function goNext() {
    if (session.index >= session.questions.length - 1) {
      onComplete({
        ...session,
        endedAt: new Date().toISOString(),
      });
      return;
    }

    onSessionChange({
      ...session,
      index: session.index + 1,
    });
  }

  const result = existing?.result;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {session.mode === "exam" ? "Exam Mode" : "Study Quiz"}
          </h3>
          <p className="text-xs text-slate-500">
            {progressLabel}
            {question.topic ? ` · ${question.topic}` : ""}
            {` · ${labelDifficulty(question.difficulty)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {remaining != null && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              {formatTime(remaining)}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
          {labelType(question.type)}
        </p>
        <p className="mt-2 text-sm font-medium text-slate-900">
          {question.prompt}
        </p>

        {marking && (
          <p className="mt-3 text-xs font-medium text-violet-700" role="status">
            Marking…
          </p>
        )}

        {!result && question.type === "mcq" && question.options && (
          <div className="mt-3 space-y-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={marking}
                onClick={() => void submitAnswer(option)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {!result && question.type === "true-false" && (
          <div className="mt-3 flex gap-2">
            {["True", "False"].map((option) => (
              <button
                key={option}
                type="button"
                disabled={marking}
                onClick={() => void submitAnswer(option)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {!result &&
          (question.type === "short" || question.type === "scenario") && (
            <div className="mt-3 space-y-2">
              <label htmlFor={`study-answer-${question.id}`} className="sr-only">
                Your answer
              </label>
              <textarea
                id={`study-answer-${question.id}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                disabled={marking}
                placeholder="Type your answer…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="button"
                disabled={marking || !draft.trim()}
                onClick={() => void submitAnswer(draft)}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-slate-300"
              >
                {marking ? "Marking…" : "Submit Answer"}
              </button>
            </div>
          )}

        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            result.verdict === "correct"
              ? "border-emerald-200 bg-emerald-50/70"
              : result.verdict === "partial"
                ? "border-amber-200 bg-amber-50/70"
                : "border-red-200 bg-red-50/70"
          }`}
        >
          <p className="text-sm font-semibold capitalize text-slate-900">
            {result.verdict === "partial"
              ? "Partially correct"
              : result.verdict}
            {" · "}
            {result.score === 1 ? "1" : result.score === 0.5 ? "0.5" : "0"} mark
          </p>
          <p className="mt-1 text-sm text-slate-800">{result.feedback}</p>
          {result.whyIncorrect && (
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Why: </span>
              {result.whyIncorrect}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Correct answer: </span>
            {result.correctAnswer}
          </p>
          <p className="mt-2 text-sm text-slate-700">{result.explanation}</p>

          <StudyReferences
            sources={result.sources}
            messageId={`study-${session.id}-${question.id}`}
          />

          <FollowUpActions
            disabled={marking}
            onPracticeAgain={() => onFollowUp("practice", question)}
            onHarder={() => onFollowUp("harder", question)}
            onEasier={() => onFollowUp("easier", question)}
            onExplainSimply={() => onFollowUp("explain", question)}
            onShowExample={() => onFollowUp("example", question)}
          />

          <div className="mt-3">
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
            >
              {session.index >= session.questions.length - 1
                ? "Finish"
                : "Next Question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function labelType(type: StudyQuestion["type"]): string {
  switch (type) {
    case "mcq":
      return "Multiple Choice";
    case "true-false":
      return "True / False";
    case "scenario":
      return "Scenario";
    default:
      return "Short Answer";
  }
}

function labelDifficulty(difficulty: StudyDifficulty): string {
  switch (difficulty) {
    case "apprentice":
      return "Apprentice";
    case "electrician":
      return "Electrician";
    case "inspector":
      return "Inspector";
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
