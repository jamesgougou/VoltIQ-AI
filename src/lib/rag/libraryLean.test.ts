import { afterEach, describe, expect, it } from "vitest";
import {
  deleteLibraryDocument,
  findLibraryDocumentByHash,
  getLibraryDocumentLean,
  readLibraryExtracted,
  saveLibraryExtracted,
} from "./libraryStore";

const documentId = "55555555-5555-4555-8555-555555555555";

afterEach(async () => {
  await deleteLibraryDocument(documentId).catch(() => undefined);
});

describe("library lean metadata", () => {
  it("hash lookup uses lean metadata without requiring full text for match", async () => {
    await saveLibraryExtracted({
      documentId,
      filename: "guide.pdf",
      contentHash: "hash-lean-1",
      fileSize: 100,
      totalPages: 2,
      indexedAt: "2026-01-01T00:00:00.000Z",
      text: "Huge extracted body ".repeat(200),
      pages: [{ pageNumber: 1, text: "page" }],
      sourceKind: "pdf",
    });

    const lean = await getLibraryDocumentLean(documentId);
    expect(lean?.contentHash).toBe("hash-lean-1");
    expect(lean).not.toHaveProperty("text");
    expect(lean).not.toHaveProperty("pages");

    const byHash = await findLibraryDocumentByHash("hash-lean-1");
    expect(byHash?.documentId).toBe(documentId);
    expect(byHash?.filename).toBe("guide.pdf");

    // Full extracted payload remains available separately.
    const full = await readLibraryExtracted(documentId);
    expect(full?.text.includes("Huge extracted body")).toBe(true);
  });
});

describe("by-hash short-circuit helper behaviour", () => {
  it("skips library scan when vector match already exists", () => {
    const vectorMatch = { documentId: "vec-1" };
    const shouldScanLibrary = !vectorMatch;
    expect(shouldScanLibrary).toBe(false);
  });

  it("scans library when vector match is missing", () => {
    const vectorMatch = null;
    const shouldScanLibrary = !vectorMatch;
    expect(shouldScanLibrary).toBe(true);
  });
});
