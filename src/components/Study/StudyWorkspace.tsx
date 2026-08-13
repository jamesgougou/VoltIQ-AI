"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateStudyMaterial } from "@/lib/study/client";
import {
  getWeakTopics,
  loadStudyProgress,
  saveStudyProgress,
  toggleBookmark,
} from "@/lib/study/progressStorage";
import {
  applyAnswerToProgressState,
  applySessionCompleteToProgressState,
} from "@/lib/study/progressUpdates";
import {
  clearActiveStudySession,
  loadActiveStudySession,
  saveActiveStudySession,
} from "@/lib/study/sessionResume";
import {
  explainSimplyPrompt,
  tutorPrompt,
} from "@/lib/study/prompts";
import type {
  MarkResult,
  StudyDifficulty,
  StudyModeId,
  StudyProgress,
  StudyQuestion,
  StudySession,
} from "@/types/study";
import { ExamResults } from "./ExamResults";
import { ExamSetup } from "./ExamSetup";
import { FlashcardDeck } from "./FlashcardDeck";
import { ProgressDashboard } from "./ProgressDashboard";
import { QuizSession, type FollowUpAction } from "./QuizSession";
import { StudyHistory } from "./StudyHistory";

type StudyWorkspaceProps = {
  activeMode: StudyModeId;
  documentIds: string[];
  onModeChange: (mode: StudyModeId) => void;
  onSendTutorPrompt: (prompt: string) => void;
  disabled?: boolean;
};

function nextDifficulty(
  current: StudyDifficulty,
  direction: "harder" | "easier",
): StudyDifficulty {
  const order: StudyDifficulty[] = ["apprentice", "electrician", "inspector"];
  const index = order.indexOf(current);
  if (direction === "harder") {
    return order[Math.min(order.length - 1, index + 1)];
  }
  return order[Math.max(0, index - 1)];
}

export function StudyWorkspace({
  activeMode,
  documentIds,
  onModeChange,
  onSendTutorPrompt,
  disabled = false,
}: StudyWorkspaceProps) {
  const [boot] = useState(() => {
    const restored = loadActiveStudySession();
    return {
      restored,
      difficulty: (restored?.difficulty ?? "electrician") as StudyDifficulty,
      session: restored?.session ?? null,
      examComplete: restored?.examComplete ?? null,
      autoStartedMode:
        restored?.session || restored?.examComplete
          ? restored.activeMode
          : null,
      skipPersistOnce: Boolean(restored),
    };
  });

  const [progress, setProgress] = useState<StudyProgress>(() =>
    loadStudyProgress(),
  );
  const [difficulty, setDifficulty] = useState<StudyDifficulty>(
    boot.difficulty,
  );
  const [session, setSession] = useState<StudySession | null>(boot.session);
  const [examComplete, setExamComplete] = useState<StudySession | null>(
    boot.examComplete,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStartedModeRef = useRef<StudyModeId | null>(boot.autoStartedMode);
  const skipPersistOnceRef = useRef(boot.skipPersistOnce);
  const restoredModeRef = useRef(boot.restored?.activeMode ?? null);

  const persistProgress = useCallback((updater: (prev: StudyProgress) => StudyProgress) => {
    setProgress((previous) => {
      const next = updater(previous);
      saveStudyProgress(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      const restoredMode = restoredModeRef.current;
      if (restoredMode && restoredMode !== activeMode) {
        onModeChange(restoredMode);
      }
      return;
    }

    saveActiveStudySession({
      activeMode,
      difficulty,
      session,
      examComplete,
    });
  }, [activeMode, difficulty, session, examComplete, onModeChange]);

  const startQuiz = useCallback(
    async (options?: {
      count?: number;
      difficulty?: StudyDifficulty;
      focusTopics?: string[];
      mode?: "quiz" | "exam";
      timed?: boolean;
      durationSeconds?: number;
      passMark?: number;
    }) => {
      if (documentIds.length === 0) {
        setError("Enable at least one document in the retrieval scope.");
        return;
      }

      setLoading(true);
      setError(null);
      setExamComplete(null);

      const resolvedDifficulty = options?.difficulty ?? difficulty;
      const weak = getWeakTopics(progress);
      const count = options?.count ?? 10;

      try {
        const result = await generateStudyMaterial({
          mode: options?.mode === "exam" ? "exam" : "quiz",
          difficulty: resolvedDifficulty,
          count,
          documentIds,
          focusTopics: options?.focusTopics ?? weak,
        });

        if (!result.questions?.length) {
          throw new Error("No questions were generated.");
        }

        setSession({
          id: crypto.randomUUID(),
          mode: options?.mode === "exam" ? "exam" : "quiz",
          difficulty: resolvedDifficulty,
          documentIds,
          questions: result.questions,
          index: 0,
          answers: [],
          startedAt: new Date().toISOString(),
          timed: options?.timed,
          durationSeconds: options?.durationSeconds,
          passMark: options?.passMark,
          focusTopics: options?.focusTopics ?? weak,
        });
        onModeChange(options?.mode === "exam" ? "exam" : "quiz");
      } catch (startError) {
        setError(
          startError instanceof Error
            ? startError.message
            : "Unable to start study session.",
        );
      } finally {
        setLoading(false);
      }
    },
    [difficulty, documentIds, onModeChange, progress],
  );

  const startFlashcards = useCallback(async () => {
    if (documentIds.length === 0) {
      setError("Enable at least one document in the retrieval scope.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await generateStudyMaterial({
        mode: "flashcards",
        difficulty,
        count: 12,
        documentIds,
        focusTopics: getWeakTopics(progress),
      });

      if (!result.flashcards?.length) {
        throw new Error("No flashcards were generated.");
      }

      setSession({
        id: crypto.randomUUID(),
        mode: "flashcards",
        difficulty,
        documentIds,
        questions: [],
        flashcards: result.flashcards,
        index: 0,
        answers: [],
        startedAt: new Date().toISOString(),
      });
      onModeChange("flashcards");
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Unable to generate flashcards.",
      );
    } finally {
      setLoading(false);
    }
  }, [difficulty, documentIds, onModeChange, progress]);

  useEffect(() => {
    if (activeMode === "idle") {
      autoStartedModeRef.current = null;
      return;
    }

    if (session || loading || examComplete) {
      return;
    }

    if (autoStartedModeRef.current === activeMode) {
      return;
    }

    if (activeMode !== "quiz" && activeMode !== "flashcards") {
      return;
    }

    autoStartedModeRef.current = activeMode;
    const mode = activeMode;
    const timeoutId = window.setTimeout(() => {
      if (mode === "quiz") {
        void startQuiz({ mode: "quiz", count: 10 });
      } else {
        void startFlashcards();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeMode, session, loading, examComplete, startQuiz, startFlashcards]);

  function handleAnswered(
    question: StudyQuestion,
    result: MarkResult,
    elapsedMs: number,
  ) {
    persistProgress((previous) =>
      applyAnswerToProgressState(
        previous,
        question.topic,
        result,
        elapsedMs,
      ),
    );
  }

  function handleComplete(completed: StudySession) {
    const withEnd = {
      ...completed,
      endedAt: completed.endedAt ?? new Date().toISOString(),
    };
    persistProgress((previous) =>
      applySessionCompleteToProgressState(previous, withEnd),
    );

    clearActiveStudySession();

    if (withEnd.mode === "exam") {
      setExamComplete(withEnd);
      setSession(null);
      return;
    }

    setSession(null);
    onModeChange("progress");
  }

  function abandonSession() {
    setSession(null);
    setExamComplete(null);
    clearActiveStudySession();
    onModeChange("idle");
  }

  function handleFollowUp(action: FollowUpAction, question: StudyQuestion) {
    if (action === "explain") {
      onSendTutorPrompt(explainSimplyPrompt(question.topic));
      return;
    }

    if (action === "example") {
      onSendTutorPrompt(
        `Using only the uploaded documents, show a real-world electrical example for: ${question.topic}. Then ask me one short check question.`,
      );
      return;
    }

    if (action === "practice") {
      void startQuiz({
        count: 5,
        difficulty,
        focusTopics: [question.topic],
      });
      return;
    }

    const next = nextDifficulty(
      difficulty,
      action === "harder" ? "harder" : "easier",
    );
    setDifficulty(next);
    void startQuiz({
      count: 5,
      difficulty: next,
      focusTopics: [question.topic],
    });
  }

  if (activeMode === "idle") {
    return null;
  }

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/20 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-medium text-slate-600">
            Difficulty
            <select
              value={difficulty}
              disabled={loading || Boolean(session)}
              onChange={(event) =>
                setDifficulty(event.target.value as StudyDifficulty)
              }
              className="ml-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              <option value="apprentice">Apprentice</option>
              <option value="electrician">Electrician</option>
              <option value="inspector">Inspector</option>
            </select>
          </label>
          {getWeakTopics(progress).length > 0 && (
            <p className="text-[11px] text-amber-700">
              Focusing weak topics: {getWeakTopics(progress).join(", ")}
            </p>
          )}
        </div>
        {activeMode !== "progress" && activeMode !== "history" && (
          <button
            type="button"
            onClick={abandonSession}
            className="text-[11px] text-slate-500 hover:text-slate-800"
          >
            Close Study Session
          </button>
        )}
      </div>

      {loading && (
        <p className="rounded-lg border border-violet-200 bg-white px-3 py-3 text-sm text-violet-700">
          Preparing study material from your knowledge library…
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {!loading && activeMode === "exam" && !session && !examComplete && (
        <ExamSetup
          disabled={disabled || documentIds.length === 0}
          onCancel={abandonSession}
          onStart={(options) => {
            void startQuiz({
              mode: "exam",
              count: options.count,
              difficulty: options.difficulty,
              timed: options.timed,
              durationSeconds: options.timed ? options.count * 90 : undefined,
              passMark: options.passMark,
            });
          }}
        />
      )}

      {!loading && examComplete && (
        <ExamResults
          session={examComplete}
          onClose={() => {
            setExamComplete(null);
            clearActiveStudySession();
            onModeChange("progress");
          }}
          onReview={() => {
            setSession({ ...examComplete, index: 0 });
            setExamComplete(null);
          }}
        />
      )}

      {!loading &&
        session &&
        (session.mode === "quiz" || session.mode === "exam") && (
          <QuizSession
            key={`${session.id}-${session.index}`}
            session={session}
            onSessionChange={setSession}
            onAnswered={handleAnswered}
            onComplete={handleComplete}
            onFollowUp={handleFollowUp}
            onClose={abandonSession}
          />
        )}

      {!loading && session?.mode === "flashcards" && session.flashcards && (
        <FlashcardDeck
          cards={session.flashcards}
          bookmarks={progress.bookmarks}
          onToggleBookmark={(cardId) =>
            persistProgress((previous) => toggleBookmark(previous, cardId))
          }
          onClose={abandonSession}
        />
      )}

      {!loading && activeMode === "progress" && (
        <ProgressDashboard progress={progress} />
      )}

      {!loading && activeMode === "history" && (
        <StudyHistory progress={progress} />
      )}

      {!loading && activeMode === "explain" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Explain Simply uses your knowledge library and opens in chat as a
            tutor lesson.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onSendTutorPrompt(explainSimplyPrompt());
              }}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Start Explain Simply
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const topic = getWeakTopics(progress)[0] || "Maximum Demand";
                onSendTutorPrompt(tutorPrompt(topic));
              }}
              className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700"
            >
              Tutor: Weak Topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
