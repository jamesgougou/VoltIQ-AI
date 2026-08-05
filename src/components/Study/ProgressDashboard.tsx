"use client";

import {
  averageScore,
  correctPercent,
  getStrongTopics,
  getWeakTopics,
} from "@/lib/study/progressStorage";
import type { StudyProgress } from "@/types/study";

type ProgressDashboardProps = {
  progress: StudyProgress;
};

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function ProgressDashboard({ progress }: ProgressDashboardProps) {
  const weak = getWeakTopics(progress);
  const strong = getStrongTopics(progress);
  const avg = averageScore(progress);
  const correct = correctPercent(progress);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Progress</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Saved locally on this device
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Questions Answered" value={String(progress.questionsAnswered)} />
        <Stat
          label="Correct %"
          value={correct == null ? "—" : `${correct}%`}
        />
        <Stat label="Study Time" value={formatDuration(progress.studyTimeMs)} />
        <Stat
          label="Average Score"
          value={avg == null ? "—" : `${avg}%`}
        />
        <Stat
          label="Last Study"
          value={
            progress.lastStudyAt
              ? new Date(progress.lastStudyAt).toLocaleDateString()
              : "—"
          }
        />
        <Stat
          label="Bookmarks"
          value={String(progress.bookmarks.length)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TopicList title="Weak Topics" topics={weak} tone="weak" />
        <TopicList title="Strongest Topics" topics={strong} tone="strong" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TopicList({
  title,
  topics,
  tone,
}: {
  title: string;
  topics: string[];
  tone: "weak" | "strong";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-xs font-semibold text-slate-800">{title}</p>
      {topics.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Complete quizzes to build this list.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {topics.map((topic) => (
            <li
              key={topic}
              className={`text-xs ${
                tone === "weak" ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {topic}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
