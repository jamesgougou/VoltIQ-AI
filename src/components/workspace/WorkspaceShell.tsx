"use client";

import type { ReactNode } from "react";
import {
  resolveWorkspaceModeSelection,
  type WorkspaceMode,
} from "@/lib/workspace/modes";
import { ModeTabBar } from "./ModeTabBar";

type WorkspaceShellProps = {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  children: ReactNode;
};

export function WorkspaceShell({
  mode,
  onModeChange,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="flex flex-col gap-4">
      <ModeTabBar
        mode={mode}
        onModeChange={(next) =>
          onModeChange(resolveWorkspaceModeSelection(mode, next))
        }
      />
      <div className="min-h-0">{children}</div>
    </div>
  );
}
