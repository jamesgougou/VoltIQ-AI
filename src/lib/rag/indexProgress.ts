import type { DocumentIndexState, IndexStage } from "@/lib/rag/types";

/** Default / PDF pipeline (no vision analyse step). */
export const INDEX_STAGE_ORDER: IndexStage[] = [
  "uploading",
  "extracting",
  "chunking",
  "embedding",
  "saving",
  "ready",
];

/** Image pipeline includes vision analysis. */
export const IMAGE_INDEX_STAGE_ORDER: IndexStage[] = [
  "uploading",
  "analysing",
  "extracting",
  "chunking",
  "embedding",
  "saving",
  "ready",
];

export const INDEX_STAGE_LABELS: Record<IndexStage, string> = {
  uploading: "Uploading",
  analysing: "Analysing image",
  extracting: "Extracting text",
  chunking: "Splitting into chunks",
  embedding: "Generating embeddings",
  saving: "Saving vector index",
  ready: "Ready",
  failed: "Failed",
};

const STAGE_BASE_PROGRESS: Record<IndexStage, number> = {
  uploading: 5,
  analysing: 10,
  extracting: 18,
  chunking: 28,
  embedding: 35,
  saving: 92,
  ready: 100,
  failed: 0,
};

const EMBEDDING_PROGRESS_RANGE = STAGE_BASE_PROGRESS.saving - STAGE_BASE_PROGRESS.embedding;

export function calculateStageProgress(
  stage: IndexStage,
  embeddedChunks = 0,
  totalChunks = 0,
): number {
  if (stage === "ready") {
    return 100;
  }

  if (stage === "failed") {
    return 0;
  }

  if (stage === "embedding" && totalChunks > 0) {
    const ratio = Math.min(embeddedChunks / totalChunks, 1);
    return Math.round(
      STAGE_BASE_PROGRESS.embedding + ratio * EMBEDDING_PROGRESS_RANGE,
    );
  }

  return STAGE_BASE_PROGRESS[stage];
}

export function estimateSecondsRemaining(
  state: Pick<
    DocumentIndexState,
    "stage" | "startedAt" | "embeddedChunks" | "totalChunks" | "progressPercent"
  >,
): number | null {
  if (!state.startedAt || state.stage === "ready" || state.stage === "failed") {
    return null;
  }

  const elapsedMs = Date.now() - new Date(state.startedAt).getTime();

  if (elapsedMs <= 0) {
    return null;
  }

  if (
    state.stage === "embedding" &&
    state.embeddedChunks &&
    state.totalChunks &&
    state.embeddedChunks > 0
  ) {
    const msPerChunk = elapsedMs / state.embeddedChunks;
    const remainingChunks = state.totalChunks - state.embeddedChunks;
    return Math.max(1, Math.round((msPerChunk * remainingChunks) / 1000));
  }

  const progress = state.progressPercent ?? 0;

  if (progress <= 0 || progress >= 100) {
    return null;
  }

  const totalEstimateMs = (elapsedMs / progress) * 100;
  return Math.max(1, Math.round((totalEstimateMs - elapsedMs) / 1000));
}

export function formatEstimatedTime(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) {
    return null;
  }

  if (seconds < 60) {
    return `Approximately ${seconds} second${seconds === 1 ? "" : "s"} remaining`;
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes === 1) {
    return "Less than 1 minute remaining";
  }

  return `Approximately ${minutes} minutes remaining`;
}

export function isIndexingActive(state?: DocumentIndexState): boolean {
  return state?.status === "indexing";
}

export function isAnyDocumentIndexing(
  states: Record<string, DocumentIndexState | undefined>,
  documentIds: string[],
): boolean {
  return documentIds.some((documentId) => isIndexingActive(states[documentId]));
}

export function getCompletedStages(
  currentStage: IndexStage | undefined,
  stageOrder: IndexStage[] = INDEX_STAGE_ORDER,
): IndexStage[] {
  if (!currentStage || currentStage === "failed") {
    return [];
  }

  const currentIndex = stageOrder.indexOf(currentStage);

  if (currentIndex <= 0) {
    // Image may be on analysing while PDF order is active — treat as none complete.
    if (currentStage === "analysing") {
      return stageOrder.includes("uploading") ? ["uploading"] : [];
    }
    return [];
  }

  return stageOrder.slice(0, currentIndex);
}

export function getCurrentStageLabel(state?: DocumentIndexState): string {
  if (!state) {
    return "Preparing...";
  }

  if (state.status === "ready") {
    return "Document ready";
  }

  if (state.status === "failed") {
    return "Indexing failed";
  }

  return INDEX_STAGE_LABELS[state.stage ?? "uploading"];
}
