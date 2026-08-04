import type { StudyTool } from "@/lib/studyTools";
import { StudyIcon } from "./StudyIcons";

type StudyCardProps = {
  tool: StudyTool;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function StudyCard({ tool, onSelect, disabled = false }: StudyCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.prompt)}
      disabled={disabled}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
      aria-label={`${tool.title}: ${tool.description}`}
    >
      <div className="mb-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
        <StudyIcon name={tool.icon} />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{tool.title}</h4>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
        {tool.description}
      </p>
    </button>
  );
}
