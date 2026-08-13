"use client";

import type { ReactNode } from "react";
import type { WorkspaceMode } from "@/lib/workspace/modes";
import {
  isWorkspacePanelActive,
  shouldRenderWorkspacePanel,
  workspacePanelId,
  workspaceTabId,
} from "@/lib/workspace/panelVisibility";

type WorkspacePanelProps = {
  mode: WorkspaceMode;
  activeMode: WorkspaceMode;
  keepAlive?: boolean;
  children: ReactNode;
};

export function WorkspacePanel({
  mode,
  activeMode,
  keepAlive = false,
  children,
}: WorkspacePanelProps) {
  const active = isWorkspacePanelActive(mode, activeMode);
  const render =
    keepAlive || shouldRenderWorkspacePanel(mode, activeMode);

  if (!render) {
    return null;
  }

  const inertProps = !active ? ({ inert: "" } as Record<string, string>) : {};

  return (
    <div
      id={workspacePanelId(mode)}
      role="tabpanel"
      aria-labelledby={workspaceTabId(mode)}
      hidden={!active}
      {...inertProps}
    >
      {children}
    </div>
  );
}
