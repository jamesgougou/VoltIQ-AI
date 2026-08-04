"use client";

import { QUICK_PROMPTS } from "@/lib/chat/quickPrompts";

type QuickPromptsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function QuickPrompts({ onSelect, disabled = false }: QuickPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:px-4 sm:py-2"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
