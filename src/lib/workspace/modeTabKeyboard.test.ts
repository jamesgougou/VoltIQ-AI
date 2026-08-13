import { describe, expect, it } from "vitest";
import {
  resolveModeTabKeyboardTarget,
  selectableWorkspaceModes,
} from "./modeTabKeyboard";

describe("ModeTabBar keyboard navigation", () => {
  const modes = selectableWorkspaceModes();

  it("excludes Inspection from selectable modes", () => {
    expect(modes).toEqual(["chat", "calculator", "study", "library"]);
    expect(modes).not.toContain("inspection");
  });

  it("moves with ArrowRight / ArrowLeft", () => {
    expect(resolveModeTabKeyboardTarget("chat", "ArrowRight", modes)).toBe(
      "calculator",
    );
    expect(resolveModeTabKeyboardTarget("library", "ArrowRight", modes)).toBe(
      "chat",
    );
    expect(resolveModeTabKeyboardTarget("study", "ArrowLeft", modes)).toBe(
      "calculator",
    );
  });

  it("jumps with Home / End", () => {
    expect(resolveModeTabKeyboardTarget("study", "Home", modes)).toBe("chat");
    expect(resolveModeTabKeyboardTarget("chat", "End", modes)).toBe("library");
  });
});
