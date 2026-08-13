import { describe, expect, it } from "vitest";
import {
  resolveStreamAriaStatus,
  shouldShowTypingIndicator,
  streamAriaStatusLabel,
} from "./streamStatus";

describe("streaming polish", () => {
  it("shows TypingIndicator only before the first token", () => {
    expect(shouldShowTypingIndicator(true, false)).toBe(true);
    expect(shouldShowTypingIndicator(true, true)).toBe(false);
    expect(shouldShowTypingIndicator(false, false)).toBe(false);
  });

  it("maps aria-live statuses", () => {
    expect(streamAriaStatusLabel("generating")).toBe("Generating");
    expect(streamAriaStatusLabel("stopped")).toBe("Stopped");
    expect(streamAriaStatusLabel("timed_out")).toBe("Timed out");
    expect(streamAriaStatusLabel("completed")).toBe("Completed");
  });

  it("resolves status for cancel / timeout / complete", () => {
    expect(
      resolveStreamAriaStatus({ isStreaming: true }),
    ).toBe("generating");
    expect(
      resolveStreamAriaStatus({
        isStreaming: false,
        failureReason: "cancelled",
      }),
    ).toBe("stopped");
    expect(
      resolveStreamAriaStatus({
        isStreaming: false,
        failureReason: "timeout",
      }),
    ).toBe("timed_out");
    expect(
      resolveStreamAriaStatus({
        isStreaming: false,
        justCompleted: true,
      }),
    ).toBe("completed");
  });
});
