"use client";

import type { StudyProgress } from "@/types/study";

type StudyHistoryProps = {
  progress: StudyProgress;
};

export function StudyHistory({ progress }: StudyHistoryProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Study History</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Recent quiz and exam sessions
        </p>
      </div>

      {progress.history.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          No study sessions yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {progress.history.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium capitalize text-slate-800">
                  {entry.mode} · {entry.difficulty}
                </p>
                <p className="text-[11px] text-slate-500">
                  {new Date(entry.at).toLocaleString()} · {entry.answered}{" "}
                  answered
                </p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  entry.scorePercent >= 70
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {entry.scorePercent}%
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
