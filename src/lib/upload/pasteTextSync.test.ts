import { describe, expect, it } from "vitest";
import {
  PASTE_TEXT_SYNC_DEBOUNCE_MS,
  resolveParentPasteText,
  shouldFlushPasteTextImmediately,
} from "./pasteTextSync";

describe("Paste Text debounce sync", () => {
  it("keeps local typing ahead of parent until debounce elapses", () => {
    expect(
      resolveParentPasteText({
        localText: "hello",
        parentText: "",
        debounceElapsedMs: 50,
      }),
    ).toBe("");

    expect(
      resolveParentPasteText({
        localText: "hello",
        parentText: "",
        debounceElapsedMs: PASTE_TEXT_SYNC_DEBOUNCE_MS,
      }),
    ).toBe("hello");
  });

  it("flushes immediately on clear", () => {
    expect(shouldFlushPasteTextImmediately("", "clear")).toBe(true);
    expect(
      resolveParentPasteText({
        localText: "",
        parentText: "old",
        debounceElapsedMs: 0,
        flushed: true,
      }),
    ).toBe("");
  });

  it("indexing receives final debounced text", () => {
    const final = resolveParentPasteText({
      localText: "AS/NZS 3000 clause text",
      parentText: "AS/NZS",
      debounceElapsedMs: 250,
    });
    expect(final).toBe("AS/NZS 3000 clause text");
  });
});
