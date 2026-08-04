"use client";

import { STUDY_TOOLS } from "@/lib/studyTools";
import { StudyCard } from "./StudyCard";

type StudyPanelProps = {
  onStudySelect: (prompt: string) => void;
  hasDocuments: boolean;
  disabled?: boolean;
};

export function StudyPanel({
  onStudySelect,
  hasDocuments,
  disabled = false,
}: StudyPanelProps) {
  const isDisabled = disabled || !hasDocuments;

  return (
    <div aria-labelledby="study-mode-heading">
      <h3
        id="study-mode-heading"
        className="text-sm font-semibold text-slate-900"
      >
        Study Mode
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Interactive learning tools for your uploaded documents
      </p>

      {!hasDocuments && (
        <p className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Upload documents to enable Study Mode.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STUDY_TOOLS.map((tool) => (
          <StudyCard
            key={tool.id}
            tool={tool}
            onSelect={onStudySelect}
            disabled={isDisabled}
          />
        ))}
      </div>
    </div>
  );
}
