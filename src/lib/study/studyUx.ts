import type { StudySession } from "@/types/study";

export function shouldConfirmAbandonSession(
  session: StudySession | null,
): boolean {
  if (!session) {
    return false;
  }
  if (session.mode !== "quiz" && session.mode !== "exam") {
    return false;
  }
  return session.answers.length > 0;
}

export function resumeNoticeLabel(
  session: StudySession | null,
  examComplete: StudySession | null,
): string | null {
  const active = session ?? examComplete;
  if (!active) {
    return null;
  }
  if (active.mode === "exam") {
    return "Resumed exam";
  }
  if (active.mode === "quiz") {
    return "Resumed quiz";
  }
  if (active.mode === "flashcards") {
    return "Resumed flashcards";
  }
  return "Resumed study session";
}

export function shouldDisableStudyStartActions(loading: boolean): boolean {
  return loading;
}
