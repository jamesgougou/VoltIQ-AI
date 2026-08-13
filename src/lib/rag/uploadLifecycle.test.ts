import { describe, expect, it } from "vitest";
import {
  bulkDeleteUiRemovals,
  decideAfterPersistAttempt,
  shouldDeletePersistedDocumentOnRemove,
  shouldProceedWithDestructiveAction,
} from "./uploadLifecycle";

describe("persist failure / indexing gate", () => {
  it("PUT failure → no healthy document and no indexing", () => {
    const decision = decideAfterPersistAttempt(false, "Unable to save PDF.");
    expect(decision.showInLibrary).toBe(false);
    expect(decision.allowIndexing).toBe(false);
    expect(decision.errorMessage).toMatch(/unable to save/i);
  });

  it("PUT success → indexing allowed", () => {
    const decision = decideAfterPersistAttempt(true);
    expect(decision.showInLibrary).toBe(true);
    expect(decision.allowIndexing).toBe(true);
    expect(decision.errorMessage).toBeNull();
  });
});

describe("clear all / delete integrity helpers", () => {
  it("requires explicit confirmation before clear/delete", () => {
    expect(shouldProceedWithDestructiveAction(false)).toBe(false);
    expect(shouldProceedWithDestructiveAction(true)).toBe(true);
  });

  it("only removes bulk-deleted IDs from UI after server success", () => {
    const ids = ["a", "b"];
    expect(bulkDeleteUiRemovals(ids, true)).toEqual(ids);
    expect(bulkDeleteUiRemovals(ids, false)).toEqual([]);
  });

  it("always deletes persisted documents on remove (including never-indexed)", () => {
    expect(shouldDeletePersistedDocumentOnRemove()).toBe(true);
  });
});
