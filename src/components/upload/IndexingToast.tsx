"use client";

import { useEffect, useRef } from "react";

type IndexingToastProps = {
  message: string | null;
  onDismiss: () => void;
};

export function IndexingToast({ message, onDismiss }: IndexingToastProps) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current();
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-emerald-800">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        Dismiss
      </button>
    </div>
  );
}
