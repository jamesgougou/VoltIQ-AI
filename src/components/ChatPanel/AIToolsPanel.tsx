"use client";

import { AI_TOOLS } from "@/lib/chat/aiTools";
import { AIToolCard } from "./AIToolCard";

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
        Choose a tool to analyse your uploaded documents.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {AI_TOOLS.map((tool) => (
          <AIToolCard
            key={tool.id}
            tool={tool}
            onSelect={onToolSelect}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
