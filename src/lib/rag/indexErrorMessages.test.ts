import { describe, expect, it } from "vitest";
import {
  DEFAULT_INDEX_ERROR_MESSAGE,
  formatIndexErrorMessage,
} from "./indexErrorMessages";

describe("friendly index errors", () => {
  it("maps known failures", () => {
    expect(formatIndexErrorMessage("OPENAI API key missing")).toMatch(/API key/i);
    expect(formatIndexErrorMessage("request timed out")).toMatch(/timed out/i);
    expect(formatIndexErrorMessage("fetch failed")).toMatch(/Network/i);
  });

  it("hides stack-like technical dumps", () => {
    expect(
      formatIndexErrorMessage("Error\n    at Object.<anonymous> (file.ts:10:5)"),
    ).toBe(DEFAULT_INDEX_ERROR_MESSAGE);
  });

  it("keeps short unknown messages", () => {
    expect(formatIndexErrorMessage("Unable to parse PDF")).toBe(
      "Unable to parse PDF",
    );
  });
});
