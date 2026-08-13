import { describe, expect, it } from "vitest";
import { ChatStreamError } from "./streamChat";
import {
  formatStreamFailure,
  shouldShowStopControl,
  streamingFlagAfterChunk,
} from "./streamingUi";

describe("chat streaming UI state", () => {
  it("shows Stop while streaming", () => {
    expect(shouldShowStopControl(true)).toBe(true);
    expect(shouldShowStopControl(false)).toBe(false);
  });

  it("does not treat the first chunk as stream completion", () => {
    expect(streamingFlagAfterChunk(true)).toBe(true);
  });

  it("distinguishes cancellation from timeout", () => {
    const cancelled = formatStreamFailure(
      new ChatStreamError("The request was cancelled.", "cancelled"),
      "Partial answer",
    );
    expect(cancelled.reason).toBe("cancelled");
    expect(cancelled.message).toContain("stopped");
    expect(cancelled.message).not.toMatch(/timed out/i);

    const timeout = formatStreamFailure(
      new ChatStreamError("The request timed out. Please try again.", "timeout"),
      "Partial answer",
    );
    expect(timeout.reason).toBe("timeout");
    expect(timeout.message).toMatch(/timed out/i);
  });

  it("preserves already received text on cancel", () => {
    const result = formatStreamFailure(
      new ChatStreamError("The request was cancelled.", "cancelled"),
      "Hello from stream",
    );
    expect(result.message.startsWith("Hello from stream")).toBe(true);
    expect(result.preserveContent).toBe(true);
  });
});
