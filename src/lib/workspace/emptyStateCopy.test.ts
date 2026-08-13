import { describe, expect, it } from "vitest";
import {
  chatEmptyStateMessage,
  indexingHelperText,
  studyEmptyStateMessage,
} from "./emptyStateCopy";

describe("empty-state CTAs copy", () => {
  it("points Chat users to Library when empty", () => {
    expect(
      chatEmptyStateMessage({ hasDocuments: false, indexingInProgress: false }),
    ).toMatch(/Library/i);
  });

  it("points Chat users to Library while indexing", () => {
    expect(
      chatEmptyStateMessage({ hasDocuments: true, indexingInProgress: true }),
    ).toMatch(/Library/i);
  });

  it("points Study users to Library when empty or indexing", () => {
    expect(
      studyEmptyStateMessage({
        hasDocuments: false,
        indexingInProgress: false,
      }),
    ).toMatch(/Library/i);
    expect(
      studyEmptyStateMessage({
        hasDocuments: true,
        indexingInProgress: true,
      }),
    ).toMatch(/Library/i);
  });

  it("indexes helper text routes to Library", () => {
    expect(indexingHelperText(true)).toMatch(/Library/i);
  });
});
