"use client";

import { AI_TOOLS } from "@/lib/chat/aiTools";

type AIToolsPanelProps = {
  onToolSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function AIToolsPanel({
  onToolSelect,
  disabled = false,
}: AIToolsPanelProps) {
  return (
    <div aria-labelledby="ai-tools-heading">
      <h3
        id="ai-tools-heading"
        className="text-sm font-semibold text-slate-900"
      >
        AI Tools
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Choose an AI tool to help analyse your uploaded documents.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {AI_TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onToolSelect(tool.prompt)}
            disabled={disabled}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  );
}
