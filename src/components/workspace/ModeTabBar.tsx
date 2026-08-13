"use client";

import { useRef } from "react";
import {
  WORKSPACE_MODE_DEFINITIONS,
  type WorkspaceMode,
} from "@/lib/workspace/modes";
import { resolveModeTabKeyboardTarget } from "@/lib/workspace/modeTabKeyboard";
import {
  workspacePanelId,
  workspaceTabId,
} from "@/lib/workspace/panelVisibility";

type ModeTabBarProps = {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
};

export function ModeTabBar({ mode, onModeChange }: ModeTabBarProps) {
  const tabRefs = useRef<Partial<Record<WorkspaceMode, HTMLButtonElement | null>>>(
    {},
  );

  function focusMode(next: WorkspaceMode) {
    onModeChange(next);
    requestAnimationFrame(() => {
      tabRefs.current[next]?.focus();
    });
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    itemId: WorkspaceMode,
    disabled: boolean,
  ) {
    if (disabled) {
      return;
    }

    const next = resolveModeTabKeyboardTarget(itemId, event.key);
    if (!next) {
      return;
    }

    event.preventDefault();
    focusMode(next);
  }

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
            ref={(element) => {
              tabRefs.current[item.id] = element;
            }}
            id={workspaceTabId(item.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={workspacePanelId(item.id)}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            tabIndex={disabled ? -1 : selected ? 0 : -1}
            title={item.description}
            onClick={() => {
              if (!disabled) {
                onModeChange(item.id);
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, item.id, disabled)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm ${
              disabled
                ? "cursor-not-allowed text-slate-300 focus-visible:outline-slate-300"
                : selected
                  ? item.id === "calculator"
                    ? "bg-amber-100 text-amber-900 focus-visible:outline-amber-500"
                    : "bg-violet-100 text-violet-900 focus-visible:outline-violet-500"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-violet-500"
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
