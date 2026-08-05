import type {
  MarkResult,
  StudyDifficulty,
  StudyProgress,
  StudySession,
  TopicStats,
} from "@/types/study";

export const STUDY_PROGRESS_KEY = "voltiq.study.progress";

const EMPTY_PROGRESS: StudyProgress = {
  questionsAnswered: 0,
  correctCount: 0,
  partialCount: 0,
  incorrectCount: 0,
  studyTimeMs: 0,
  scores: [],
  topics: {},
  bookmarks: [],
  history: [],
};

function emptyTopic(): TopicStats {
  return { attempts: 0, correct: 0, partial: 0, incorrect: 0 };
}

export function loadStudyProgress(): StudyProgress {
  if (typeof window === "undefined") {
    return { ...EMPTY_PROGRESS, topics: {}, bookmarks: [], history: [], scores: [] };
  }

  try {
    const raw = window.localStorage.getItem(STUDY_PROGRESS_KEY);
    if (!raw) {
      return {
        ...EMPTY_PROGRESS,
        topics: {},
        bookmarks: [],
        history: [],
        scores: [],
      };
    }

    const parsed = JSON.parse(raw) as StudyProgress;
    return {
      ...EMPTY_PROGRESS,
      ...parsed,
      topics: parsed.topics ?? {},
      bookmarks: parsed.bookmarks ?? [],
      history: parsed.history ?? [],
      scores: parsed.scores ?? [],
    };
  } catch {
    return {
      ...EMPTY_PROGRESS,
      topics: {},
      bookmarks: [],
      history: [],
      scores: [],
    };
  }
}

export function saveStudyProgress(progress: StudyProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage failures.
  }
}

export function getWeakTopics(progress: StudyProgress, limit = 4): string[] {
  return Object.entries(progress.topics)
    .map(([topic, stats]) => {
      const weighted =
        stats.correct + stats.partial * 0.5;
      const rate = stats.attempts > 0 ? weighted / stats.attempts : 1;
      return { topic, rate, attempts: stats.attempts };
    })
    .filter((entry) => entry.attempts >= 1)
    .sort((left, right) => left.rate - right.rate || right.attempts - left.attempts)
    .slice(0, limit)
    .map((entry) => entry.topic);
}

export function getStrongTopics(progress: StudyProgress, limit = 4): string[] {
  return Object.entries(progress.topics)
    .map(([topic, stats]) => {
      const weighted = stats.correct + stats.partial * 0.5;
      const rate = stats.attempts > 0 ? weighted / stats.attempts : 0;
      return { topic, rate, attempts: stats.attempts };
    })
    .filter((entry) => entry.attempts >= 1)
    .sort((left, right) => right.rate - left.rate || right.attempts - left.attempts)
    .slice(0, limit)
    .map((entry) => entry.topic);
}

export function recordAnswerInProgress(
  progress: StudyProgress,
  topic: string,
  result: MarkResult,
  elapsedMs = 0,
): StudyProgress {
  const topics = { ...progress.topics };
  const stats = { ...(topics[topic] ?? emptyTopic()) };
  stats.attempts += 1;

  if (result.verdict === "correct") {
    stats.correct += 1;
  } else if (result.verdict === "partial") {
    stats.partial += 1;
  } else {
    stats.incorrect += 1;
  }

  topics[topic] = stats;

  return {
    ...progress,
    questionsAnswered: progress.questionsAnswered + 1,
    correctCount:
      progress.correctCount + (result.verdict === "correct" ? 1 : 0),
    partialCount:
      progress.partialCount + (result.verdict === "partial" ? 1 : 0),
    incorrectCount:
      progress.incorrectCount + (result.verdict === "incorrect" ? 1 : 0),
    studyTimeMs: progress.studyTimeMs + Math.max(0, elapsedMs),
    topics,
    lastStudyAt: new Date().toISOString(),
  };
}

export function recordSessionSummary(
  progress: StudyProgress,
  session: StudySession,
  difficulty: StudyDifficulty,
): StudyProgress {
  const answered = session.answers.length;
  if (answered === 0) {
    return progress;
  }

  const totalScore = session.answers.reduce(
    (sum, answer) => sum + answer.result.score,
    0,
  );
  const scorePercent = Math.round((totalScore / answered) * 100);

  return {
    ...progress,
    scores: [...progress.scores, scorePercent].slice(-50),
    lastStudyAt: new Date().toISOString(),
    history: [
      {
        id: session.id,
        mode: session.mode,
        scorePercent,
        answered,
        at: new Date().toISOString(),
        difficulty,
      },
      ...progress.history,
    ].slice(0, 30),
  };
}

export function toggleBookmark(
  progress: StudyProgress,
  cardId: string,
): StudyProgress {
  const exists = progress.bookmarks.includes(cardId);
  return {
    ...progress,
    bookmarks: exists
      ? progress.bookmarks.filter((id) => id !== cardId)
      : [...progress.bookmarks, cardId],
  };
}

export function averageScore(progress: StudyProgress): number | null {
  if (progress.scores.length === 0) {
    return null;
  }

  const sum = progress.scores.reduce((total, score) => total + score, 0);
  return Math.round(sum / progress.scores.length);
}

export function correctPercent(progress: StudyProgress): number | null {
  if (progress.questionsAnswered === 0) {
    return null;
  }

  const weighted =
    progress.correctCount + progress.partialCount * 0.5;
  return Math.round((weighted / progress.questionsAnswered) * 100);
}
