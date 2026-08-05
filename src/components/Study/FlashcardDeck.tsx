"use client";

import { useMemo, useState } from "react";
import type { StudyFlashcard } from "@/types/study";
import { StudyReferences } from "./StudyReferences";

type FlashcardDeckProps = {
  cards: StudyFlashcard[];
  bookmarks: string[];
  onToggleBookmark: (cardId: string) => void;
  onClose: () => void;
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

export function FlashcardDeck({
  cards,
  bookmarks,
  onToggleBookmark,
  onClose,
}: FlashcardDeckProps) {
  const [order, setOrder] = useState(() => cards.map((card) => card.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewBookmarksOnly, setReviewBookmarksOnly] = useState(false);

  const visibleIds = useMemo(() => {
    if (!reviewBookmarksOnly) {
      return order;
    }
    return order.filter((id) => bookmarks.includes(id));
  }, [order, reviewBookmarksOnly, bookmarks]);

  const cardById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );

  const currentId = visibleIds[Math.min(index, Math.max(visibleIds.length - 1, 0))];
  const current = currentId ? cardById.get(currentId) : undefined;

  if (!current || visibleIds.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {reviewBookmarksOnly
            ? "No bookmarked cards yet."
            : "No flashcards available."}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          Back
        </button>
      </div>
    );
  }

  const bookmarked = bookmarks.includes(current.id);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Flashcards</h3>
          <p className="text-xs text-slate-500">
            Card {Math.min(index + 1, visibleIds.length)} / {visibleIds.length}
            {current.topic ? ` · ${current.topic}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setOrder((currentOrder) => shuffle(currentOrder));
              setIndex(0);
              setFlipped(false);
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex(Math.floor(Math.random() * visibleIds.length));
              setFlipped(false);
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
          >
            Random
          </button>
          <button
            type="button"
            onClick={() => {
              setReviewBookmarksOnly((value) => !value);
              setIndex(0);
              setFlipped(false);
            }}
            className={`rounded-md border px-2 py-1 text-[11px] ${
              reviewBookmarksOnly
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Bookmarks
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
          >
            Close
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="flex min-h-[160px] w-full flex-col items-center justify-center rounded-xl border border-violet-200 bg-violet-50/40 px-4 py-6 text-center transition-colors hover:bg-violet-50"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
          {flipped ? "Answer" : "Prompt"} · tap to flip
        </p>
        <p className="mt-3 text-sm font-medium text-slate-900">
          {flipped ? current.back : current.front}
        </p>
      </button>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => {
            setIndex((value) => Math.max(0, value - 1));
            setFlipped(false);
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={index >= visibleIds.length - 1}
          onClick={() => {
            setIndex((value) => Math.min(visibleIds.length - 1, value + 1));
            setFlipped(false);
          }}
          className="rounded-md border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 disabled:opacity-40"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onToggleBookmark(current.id)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            bookmarked
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>

      {flipped && (
        <StudyReferences
          sources={current.sources}
          messageId={`flashcard-${current.id}`}
        />
      )}
    </div>
  );
}
