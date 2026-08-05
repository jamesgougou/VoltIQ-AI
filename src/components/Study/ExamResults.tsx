"use client";

import type { StudySession } from "@/types/study";
import { StudyReferences } from "./StudyReferences";

type ExamResultsProps = {
  session: StudySession;
  onReview: () => void;
  onClose: () => void;
};

export function ExamResults({ session, onReview, onClose }: ExamResultsProps) {
  const answered = session.answers.length;
  const total = session.questions.length;
  const score = session.answers.reduce(
    (sum, answer) => sum + answer.result.score,
    0,
  );
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passMark = session.passMark ?? 70;
  const passed = percent >= passMark;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Exam Results</h3>
        <p className="mt-0.5 text-xs text-slate-500">Review your assessment</p>
      </div>

      <div
        className={`rounded-xl border px-4 py-4 ${
          passed
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-amber-200 bg-amber-50/70"
        }`}
      >
        <p className="text-2xl font-semibold text-slate-900">
          {score} / {total}
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {percent}% · Pass mark {passMark}% ·{" "}
          <span className="font-semibold">{passed ? "Pass" : "Not yet"}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {answered} of {total} questions answered
        </p>
      </div>

      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {session.questions.map((question, index) => {
          const answer = session.answers.find(
            (item) => item.questionId === question.id,
          );
          return (
            <li
              key={question.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <p className="text-xs font-medium text-slate-800">
                Q{index + 1}. {question.prompt}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Your answer: {answer?.userAnswer ?? "—"} ·{" "}
                {answer?.result.verdict ?? "unanswered"}
              </p>
              {answer && (
                <StudyReferences
                  sources={answer.result.sources}
                  messageId={`exam-review-${session.id}-${question.id}`}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReview}
          className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
        >
          Review Answers
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
