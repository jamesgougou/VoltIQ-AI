"use client";

import {
  formatEstimatedTime,
  getCompletedStages,
  INDEX_STAGE_LABELS,
  INDEX_STAGE_ORDER,
} from "@/lib/rag/indexProgress";
import type { DocumentIndexState, IndexStage } from "@/types/rag";

type DocumentIndexProgressCardProps = {
  filename: string;
  state?: DocumentIndexState;
  onRetry?: () => void;
  compact?: boolean;
};

function StageIcon({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span className="text-emerald-600" aria-hidden="true">
        ✓
      </span>
    );
  }

  return (
    <span className="inline-block h-3 w-3 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-1">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-right text-[11px] font-medium text-slate-500">{clamped}%</p>
    </div>
  );
}

function PipelineStages({ currentStage }: { currentStage: IndexStage }) {
  const completed = new Set(getCompletedStages(currentStage));
  const visibleStages = INDEX_STAGE_ORDER.filter((stage) => stage !== "ready");

  return (
    <ul className="space-y-1.5 text-[11px] text-slate-600">
      {visibleStages.map((stage) => {
        const isComplete = completed.has(stage);
        const isCurrent = stage === currentStage;

        return (
          <li key={stage} className="flex items-center gap-2">
            {isComplete ? (
              <span className="text-emerald-600">✓</span>
            ) : isCurrent ? (
              <StageIcon complete={false} />
            ) : (
              <span className="inline-block h-3 w-3 rounded-full border border-slate-300" />
            )}
            <span className={isCurrent ? "font-medium text-slate-800" : undefined}>
              {INDEX_STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DocumentIndexProgressCard({
  filename,
  state,
  onRetry,
  compact = false,
}: DocumentIndexProgressCardProps) {
  if (!state) {
    return null;
  }

  if (state.status === "ready") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
        <p className="text-xs font-semibold text-emerald-800">✅ Document ready</p>
        <p className="mt-1 text-[11px] text-emerald-700">Indexed successfully</p>
        {state.chunkCount != null && (
          <p className="mt-0.5 text-[11px] text-emerald-700">
            {state.chunkCount.toLocaleString()} searchable chunks
          </p>
        )}
        <p className="mt-1 text-[11px] font-medium text-emerald-800">
          Ready for AI questions.
        </p>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
        <p className="text-xs font-semibold text-red-800">
          ❌ {state.error ?? "Unable to generate embeddings."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const progress = state.progressPercent ?? 0;
  const eta = formatEstimatedTime(state.estimatedSecondsRemaining);

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-slate-800" title={filename}>
          {filename}
        </p>
        <span className="shrink-0 text-[11px] font-medium text-violet-700">
          {INDEX_STAGE_LABELS[state.stage ?? "uploading"]}
        </span>
      </div>

      <div className="mt-2">
        <ProgressBar value={progress} />
      </div>

      {state.stage === "embedding" &&
        state.totalChunks != null &&
        state.totalChunks > 0 && (
          <p className="mt-2 text-[11px] text-slate-600">
            Generating embeddings...{" "}
            <span className="font-medium text-slate-800">
              {(state.embeddedChunks ?? 0).toLocaleString()} /{" "}
              {state.totalChunks.toLocaleString()} chunks
            </span>
          </p>
        )}

      {eta && <p className="mt-1 text-[11px] text-slate-500">{eta}</p>}

      {!compact && (
        <div className="mt-3 border-t border-violet-100 pt-3">
          <PipelineStages currentStage={state.stage ?? "uploading"} />
        </div>
      )}
    </div>
  );
}
