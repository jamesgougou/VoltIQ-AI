"use client";

import { STUDY_TOOLS } from "@/lib/studyTools";
import type { StudyModeId } from "@/types/study";
import { StudyCard } from "./StudyCard";
import { StudyWorkspace } from "./StudyWorkspace";

type StudyPanelProps = {
  activeMode: StudyModeId;
  onModeChange: (mode: StudyModeId) => void;
  documentIds: string[];
  onSendTutorPrompt: (prompt: string) => void;
  hasDocuments: boolean;
  disabled?: boolean;
};

export function StudyPanel({
  activeMode,
  onModeChange,
  documentIds,
  onSendTutorPrompt,
  hasDocuments,
  disabled = false,
}: StudyPanelProps) {
  const isDisabled = disabled || !hasDocuments;

  return (
    <div aria-labelledby="study-mode-heading" className="space-y-3">
      <div>
        <h3
          id="study-mode-heading"
          className="text-sm font-semibold text-slate-900"
        >
          Study Mode
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          AI tutor, quizzes, flashcards and exams from your knowledge library
        </p>
      </div>

      {!hasDocuments && (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Upload documents to enable Study Mode.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STUDY_TOOLS.map((tool) => (
          <StudyCard
            key={tool.id}
            tool={tool}
            onSelect={onModeChange}
            disabled={isDisabled && tool.id !== "progress" && tool.id !== "history"}
            active={activeMode === tool.id}
          />
        ))}
      </div>

      {activeMode !== "idle" && (
        <StudyWorkspace
          activeMode={activeMode}
          documentIds={documentIds}
          onModeChange={onModeChange}
          onSendTutorPrompt={onSendTutorPrompt}
          disabled={isDisabled}
        />
      )}
    </div>
  );
}
