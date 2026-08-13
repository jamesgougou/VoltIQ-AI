import type { AITool } from "@/lib/chat/aiTools";
import { AIToolIconDisplay } from "./AIToolIcons";

type AIToolCardProps = {
  tool: AITool;
  onSelect: (tool: AITool) => void;
  disabled?: boolean;
};

export function AIToolCard({ tool, onSelect, disabled = false }: AIToolCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool)}
      disabled={disabled}
      className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-violet-200 hover:bg-violet-50/40 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={`${tool.title}: ${tool.description}`}
    >
      <div className="mb-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
        <AIToolIconDisplay name={tool.icon} />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{tool.title}</h4>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
        {tool.description}
      </p>
    </button>
  );
}
