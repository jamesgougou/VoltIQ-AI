import type { StudyTool } from "@/lib/studyTools";
import type { StudyModeId } from "@/types/study";
import { StudyIcon } from "./StudyIcons";

type StudyCardProps = {
  tool: StudyTool;
  onSelect: (mode: StudyModeId) => void;
  disabled?: boolean;
  active?: boolean;
};

export function StudyCard({
  tool,
  onSelect,
  disabled = false,
  active = false,
}: StudyCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      disabled={disabled}
      className={`group flex h-full flex-col rounded-xl border p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm ${
        active
          ? "border-violet-300 bg-violet-50/50"
          : "border-slate-200 bg-white"
      }`}
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
