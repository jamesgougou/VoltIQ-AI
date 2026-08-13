import { describe, expect, it } from "vitest";
import {
  isWorkspacePanelActive,
  shouldAbortStreamOnChatUnmount,
  shouldKeepWorkspacePanelAlive,
  shouldRenderWorkspacePanel,
  workspacePanelId,
  workspaceTabId,
} from "./panelVisibility";

describe("workspace panel keep-alive", () => {
  it("keeps Chat mounted across mode switches", () => {
    expect(shouldKeepWorkspacePanelAlive("chat")).toBe(true);
    expect(shouldRenderWorkspacePanel("chat", "library")).toBe(true);
    expect(shouldRenderWorkspacePanel("chat", "study")).toBe(true);
    expect(isWorkspacePanelActive("chat", "library")).toBe(false);
  });

  it("unmounts non-chat panels when inactive", () => {
    expect(shouldRenderWorkspacePanel("library", "chat")).toBe(false);
    expect(shouldRenderWorkspacePanel("study", "study")).toBe(true);
    expect(shouldKeepWorkspacePanelAlive("calculator")).toBe(false);
  });

  it("aborts streaming only when an AbortController is available", () => {
    expect(shouldAbortStreamOnChatUnmount(true, true)).toBe(true);
    expect(shouldAbortStreamOnChatUnmount(true, false)).toBe(false);
    expect(shouldAbortStreamOnChatUnmount(false, true)).toBe(false);
  });

  it("links tab and panel ids", () => {
    expect(workspaceTabId("chat")).toBe("workspace-tab-chat");
    expect(workspacePanelId("study")).toBe("workspace-panel-study");
  });
});
