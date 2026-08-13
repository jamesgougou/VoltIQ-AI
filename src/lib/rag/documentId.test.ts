import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeDocumentId,
  getLibraryRootDir,
  isSafeDocumentId,
  UnsafeDocumentIdError,
} from "./documentId";

describe("assertSafeDocumentId", () => {
  it("accepts a valid UUID", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(assertSafeDocumentId(id)).toBe(id);
    expect(isSafeDocumentId(id)).toBe(true);
  });

  it("accepts the pasted-text document id", () => {
    expect(assertSafeDocumentId("pasted-text")).toBe("pasted-text");
  });

  it("rejects ../ traversal", () => {
    expect(() => assertSafeDocumentId("../secrets")).toThrow(
      UnsafeDocumentIdError,
    );
    expect(() => assertSafeDocumentId("..\\secrets")).toThrow(
      UnsafeDocumentIdError,
    );
    expect(isSafeDocumentId("../etc/passwd")).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(() => assertSafeDocumentId("/etc/passwd")).toThrow(
      UnsafeDocumentIdError,
    );
    expect(() => assertSafeDocumentId("C:\\Windows\\System32")).toThrow(
      UnsafeDocumentIdError,
    );
  });

  it("rejects slash and backslash traversal", () => {
    expect(() => assertSafeDocumentId("foo/bar")).toThrow(UnsafeDocumentIdError);
    expect(() => assertSafeDocumentId("foo\\bar")).toThrow(
      UnsafeDocumentIdError,
    );
    expect(() => assertSafeDocumentId("foo/../bar")).toThrow(
      UnsafeDocumentIdError,
    );
  });

  it("keeps resolved paths inside the library directory", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const safe = assertSafeDocumentId(id);
    const resolved = path.resolve(getLibraryRootDir(), safe);
    const relative = path.relative(path.resolve(getLibraryRootDir()), resolved);

    expect(relative.startsWith("..")).toBe(false);
    expect(path.isAbsolute(relative)).toBe(false);
  });
});
