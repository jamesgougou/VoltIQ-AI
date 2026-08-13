import type { MarkResult, StudyProgress, StudySession } from "@/types/study";
import {
  recordAnswerInProgress,
  recordSessionSummary,
} from "@/lib/study/progressStorage";

/** Functional updater helper — avoids losing the last answer before summary. */
export function applyAnswerToProgressState(
  previous: StudyProgress,
  topic: string,
  result: MarkResult,
  elapsedMs: number,
): StudyProgress {
  return recordAnswerInProgress(previous, topic, result, elapsedMs);
}

export function applySessionCompleteToProgressState(
  previous: StudyProgress,
  session: StudySession,
): StudyProgress {
  return recordSessionSummary(previous, session, session.difficulty);
}
