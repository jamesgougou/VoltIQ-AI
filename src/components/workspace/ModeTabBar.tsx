"use client";

import {
  WORKSPACE_MODE_DEFINITIONS,
  type WorkspaceMode,
} from "@/lib/workspace/modes";

type ModeTabBarProps = {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
};

export function ModeTabBar({ mode, onModeChange }: ModeTabBarProps) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="tablist"
      aria-label="Workspace modes"
    >
      {WORKSPACE_MODE_DEFINITIONS.map((item) => {
        const selected = mode === item.id;
        const disabled = Boolean(item.disabled);

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            title={item.description}
            onClick={() => onModeChange(item.id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
              disabled
                ? "cursor-not-allowed text-slate-300"
                : selected
                  ? item.id === "calculator"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-violet-100 text-violet-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.label}
            {disabled ? (
              <span className="ml-1 text-[10px] font-normal opacity-70">
                soon
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
