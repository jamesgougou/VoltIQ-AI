const DEBUG =
  process.env.RAG_DEBUG === "1" ||
  process.env.NODE_ENV === "development";

export type RagStage =
  | "upload"
  | "extract"
  | "chunk"
  | "embed"
  | "store"
  | "ready"
  | "failed"
  | "retrieve";

function prefix(stage: RagStage): string {
  return `[RAG:${stage}]`;
}

export function ragLog(stage: RagStage, message: string, details?: unknown) {
  if (details !== undefined) {
    console.info(`${prefix(stage)} ${message}`, details);
    return;
  }

  console.info(`${prefix(stage)} ${message}`);
}

export function ragDebug(message: string, details?: Record<string, unknown>) {
  if (!DEBUG) {
    return;
  }

  if (details) {
    console.info(`[RAG:debug] ${message}`, details);
    return;
  }

  console.info(`[RAG:debug] ${message}`);
}

export function ragError(stage: RagStage, message: string, error?: unknown) {
  console.error(`${prefix(stage)} ${message}`, error);
}
