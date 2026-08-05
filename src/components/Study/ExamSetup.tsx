"use client";

import { useState } from "react";
import type { StudyDifficulty } from "@/types/study";

type ExamSetupProps = {
  disabled?: boolean;
  onStart: (options: {
    count: 10 | 20 | 50;
    timed: boolean;
    passMark: number;
    difficulty: StudyDifficulty;
  }) => void;
  onCancel: () => void;
};

export function ExamSetup({ disabled = false, onStart, onCancel }: ExamSetupProps) {
  const [count, setCount] = useState<10 | 20 | 50>(10);
  const [timed, setTimed] = useState(false);
  const [passMark, setPassMark] = useState(70);
  const [difficulty, setDifficulty] =
    useState<StudyDifficulty>("electrician");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Exam Mode</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Generate a realistic mock exam from your knowledge library
        </p>
      </div>

      <label className="block text-xs font-medium text-slate-600">
        Questions
        <select
          value={count}
          onChange={(event) =>
            setCount(Number(event.target.value) as 10 | 20 | 50)
          }
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value={10}>10 Questions</option>
          <option value={20}>20 Questions</option>
          <option value={50}>50 Questions</option>
        </select>
      </label>

      <label className="block text-xs font-medium text-slate-600">
        Difficulty
        <select
          value={difficulty}
          onChange={(event) =>
            setDifficulty(event.target.value as StudyDifficulty)
          }
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="apprentice">Apprentice</option>
          <option value="electrician">Electrician</option>
          <option value="inspector">Inspector</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={timed}
          onChange={(event) => setTimed(event.target.checked)}
        />
        Timed Mode ({count * 90} seconds)
      </label>

      <label className="block text-xs font-medium text-slate-600">
        Pass Mark (%)
        <input
          type="number"
          min={50}
          max={100}
          value={passMark}
          onChange={(event) => setPassMark(Number(event.target.value) || 70)}
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onStart({ count, timed, passMark, difficulty })
          }
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-slate-300"
        >
          Start Exam
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
