"use client";

import { useState } from "react";
import { STUDY_TOOLS } from "@/lib/studyTools";
import { shouldDisableStudyStartActions } from "@/lib/study/studyUx";
import { studyEmptyStateMessage } from "@/lib/workspace/emptyStateCopy";
import type { StudyModeId } from "@/types/study";
import { StudyCard } from "./StudyCard";
import { StudyWorkspace } from "./StudyWorkspace";

type StudyPanelProps = {
  activeMode: StudyModeId;
  onModeChange: (mode: StudyModeId) => void;
  documentIds: string[];
  onSendTutorPrompt: (prompt: string) => void;
  onRequestLibraryMode?: () => void;
  hasDocuments: boolean;
  indexingInProgress?: boolean;
  disabled?: boolean;
};

export function StudyPanel({
  activeMode,
  onModeChange,
  documentIds,
  onSendTutorPrompt,
  onRequestLibraryMode,
  hasDocuments,
  indexingInProgress = false,
  disabled = false,
}: StudyPanelProps) {
  const [generationLoading, setGenerationLoading] = useState(false);
  const isDisabled = disabled || !hasDocuments;
  const startsLocked = shouldDisableStudyStartActions(generationLoading);
  const emptyMessage = studyEmptyStateMessage({
    hasDocuments,
    indexingInProgress,
  });

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

      {emptyMessage ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <p>{emptyMessage}</p>
          {onRequestLibraryMode ? (
            <button
              type="button"
              onClick={onRequestLibraryMode}
              className="mt-2 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800 hover:bg-violet-100"
            >
              Open Library
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {STUDY_TOOLS.map((tool) => {
          const isProgressOrHistory =
            tool.id === "progress" || tool.id === "history";
          return (
            <StudyCard
              key={tool.id}
              tool={tool}
              onSelect={onModeChange}
              disabled={
                (isDisabled && !isProgressOrHistory) ||
                (startsLocked && !isProgressOrHistory)
              }
              active={activeMode === tool.id}
            />
          );
        })}
      </div>

      {activeMode !== "idle" && (
        <StudyWorkspace
          activeMode={activeMode}
          documentIds={documentIds}
          onModeChange={onModeChange}
          onSendTutorPrompt={onSendTutorPrompt}
          onLoadingChange={setGenerationLoading}
          disabled={isDisabled}
        />
      )}
    </div>
  );
}
