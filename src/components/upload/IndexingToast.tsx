"use client";

import { useEffect } from "react";

type IndexingToastProps = {
  message: string | null;
  onDismiss: () => void;
};

export function IndexingToast({ message, onDismiss }: IndexingToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

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
        className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700"
      >
        Dismiss
      </button>
    </div>
  );
}
