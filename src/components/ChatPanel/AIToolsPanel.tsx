"use client";

import { AI_TOOLS, type AITool } from "@/lib/chat/aiTools";
import { AIToolCard } from "./AIToolCard";

type AIToolsPanelProps = {
  onToolSelect: (tool: AITool) => void;
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
        className="sr-only"
      >
        AI Tools
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Analyse your uploaded documents. Generate Questions opens Study Mode.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
