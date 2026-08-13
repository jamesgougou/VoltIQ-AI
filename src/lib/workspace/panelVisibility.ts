import type { WorkspaceMode } from "@/lib/workspace/modes";

/** Chat stays mounted across mode switches so history/streaming survive. */
export function shouldKeepWorkspacePanelAlive(mode: WorkspaceMode): boolean {
  return mode === "chat";
}

export function isWorkspacePanelActive(
  panelMode: WorkspaceMode,
  activeMode: WorkspaceMode,
): boolean {
  return panelMode === activeMode;
}

/**
 * Hidden keep-alive panels must remain mounted; inactive non-keepalive panels unmount.
 */
export function shouldRenderWorkspacePanel(
  panelMode: WorkspaceMode,
  activeMode: WorkspaceMode,
): boolean {
  if (shouldKeepWorkspacePanelAlive(panelMode)) {
    return true;
  }
  return isWorkspacePanelActive(panelMode, activeMode);
}

/** Abort in-flight chat when Chat truly unmounts (not when merely hidden). */
export function shouldAbortStreamOnChatUnmount(
  isStreaming: boolean,
  abortAvailable: boolean,
): boolean {
  return isStreaming && abortAvailable;
}

export function workspaceTabId(mode: WorkspaceMode): string {
  return `workspace-tab-${mode}`;
}

export function workspacePanelId(mode: WorkspaceMode): string {
  return `workspace-panel-${mode}`;
}
