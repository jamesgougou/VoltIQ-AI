import type { StudyDifficulty, StudyModeId, StudySession } from "@/types/study";

export const STUDY_ACTIVE_SESSION_KEY = "voltiq.study.activeSession";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SESSION_VERSION = 1 as const;

export type PersistedActiveStudy = {
  version: typeof SESSION_VERSION;
  activeMode: StudyModeId;
  difficulty: StudyDifficulty;
  session: StudySession | null;
  examComplete: StudySession | null;
  savedAt: string;
};

export function isActiveStudyPersistable(
  activeMode: StudyModeId,
  session: StudySession | null,
  examComplete: StudySession | null,
): boolean {
  if (examComplete) {
    return true;
  }

  if (!session) {
    return false;
  }

  // Completed sessions should not remain as "active".
  if (session.endedAt) {
    return false;
  }

  return (
    activeMode === "quiz" ||
    activeMode === "exam" ||
    activeMode === "flashcards" ||
    session.mode === "quiz" ||
    session.mode === "exam" ||
    session.mode === "flashcards"
  );
}

export function isPersistedStudyFresh(
  savedAt: string,
  nowMs = Date.now(),
): boolean {
  const savedMs = Date.parse(savedAt);
  if (Number.isNaN(savedMs)) {
    return false;
  }
  return nowMs - savedMs <= SESSION_MAX_AGE_MS;
}

export function serializeActiveStudy(input: {
  activeMode: StudyModeId;
  difficulty: StudyDifficulty;
  session: StudySession | null;
  examComplete: StudySession | null;
  savedAt?: string;
}): PersistedActiveStudy | null {
  if (
    !isActiveStudyPersistable(
      input.activeMode,
      input.session,
      input.examComplete,
    )
  ) {
    return null;
  }

  return {
    version: SESSION_VERSION,
    activeMode: input.activeMode,
    difficulty: input.difficulty,
    session: input.session,
    examComplete: input.examComplete,
    savedAt: input.savedAt ?? new Date().toISOString(),
  };
}

export function parseActiveStudy(
  raw: string | null,
  nowMs = Date.now(),
): PersistedActiveStudy | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedActiveStudy;
    if (parsed.version !== SESSION_VERSION) {
      return null;
    }
    if (!isPersistedStudyFresh(parsed.savedAt, nowMs)) {
      return null;
    }
    if (
      !isActiveStudyPersistable(
        parsed.activeMode,
        parsed.session,
        parsed.examComplete,
      )
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadActiveStudySession(): PersistedActiveStudy | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseActiveStudy(
      window.sessionStorage.getItem(STUDY_ACTIVE_SESSION_KEY),
    );
  } catch {
    return null;
  }
}

export function saveActiveStudySession(input: {
  activeMode: StudyModeId;
  difficulty: StudyDifficulty;
  session: StudySession | null;
  examComplete: StudySession | null;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload = serializeActiveStudy(input);
    if (!payload) {
      window.sessionStorage.removeItem(STUDY_ACTIVE_SESSION_KEY);
      return;
    }
    window.sessionStorage.setItem(
      STUDY_ACTIVE_SESSION_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function clearActiveStudySession(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(STUDY_ACTIVE_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}
