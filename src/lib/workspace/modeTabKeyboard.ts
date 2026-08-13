import {
  WORKSPACE_MODE_DEFINITIONS,
  canSelectWorkspaceMode,
  type WorkspaceMode,
} from "@/lib/workspace/modes";

export function selectableWorkspaceModes(): WorkspaceMode[] {
  return WORKSPACE_MODE_DEFINITIONS.filter((item) =>
    canSelectWorkspaceMode(item.id),
  ).map((item) => item.id);
}

export function resolveModeTabKeyboardTarget(
  current: WorkspaceMode,
  key: string,
  modes: WorkspaceMode[] = selectableWorkspaceModes(),
): WorkspaceMode | null {
  if (modes.length === 0) {
    return null;
  }

  const index = Math.max(0, modes.indexOf(current));

  if (key === "Home") {
    return modes[0] ?? null;
  }

  if (key === "End") {
    return modes[modes.length - 1] ?? null;
  }

  if (key === "ArrowRight" || key === "ArrowDown") {
    return modes[(index + 1) % modes.length] ?? null;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return modes[(index - 1 + modes.length) % modes.length] ?? null;
  }

  return null;
}
