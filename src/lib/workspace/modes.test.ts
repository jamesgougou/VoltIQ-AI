import { describe, expect, it } from "vitest";
import {
  canSelectWorkspaceMode,
  DEFAULT_WORKSPACE_MODE,
  isWorkspaceMode,
  resolveWorkspaceModeSelection,
} from "./modes";

describe("workspace mode selection", () => {
  it("defaults to chat", () => {
    expect(DEFAULT_WORKSPACE_MODE).toBe("chat");
  });

  it("recognizes valid modes", () => {
    expect(isWorkspaceMode("study")).toBe(true);
    expect(isWorkspaceMode("inspection")).toBe(true);
    expect(isWorkspaceMode("settings")).toBe(false);
  });

  it("allows Chat / Calculator / Study / Library", () => {
    expect(canSelectWorkspaceMode("chat")).toBe(true);
    expect(canSelectWorkspaceMode("calculator")).toBe(true);
    expect(canSelectWorkspaceMode("study")).toBe(true);
    expect(canSelectWorkspaceMode("library")).toBe(true);
  });

  it("reserves Inspection as a disabled slot", () => {
    expect(canSelectWorkspaceMode("inspection")).toBe(false);
    expect(resolveWorkspaceModeSelection("chat", "inspection")).toBe("chat");
  });

  it("switches to a selectable mode", () => {
    expect(resolveWorkspaceModeSelection("chat", "library")).toBe("library");
    expect(resolveWorkspaceModeSelection("library", "calculator")).toBe(
      "calculator",
    );
  });
});
