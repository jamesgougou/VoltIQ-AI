import { describe, expect, it } from "vitest";
import {
  collectEnabledManagedIds,
  pruneRetrievalScope,
  resolveRetrievalDocumentIds,
  type RetrievalScope,
} from "./libraryMeta";

describe("retrieval scope preservation", () => {
  const imageId = "11111111-1111-4111-8111-111111111111";
  const pdfId = "22222222-2222-4222-8222-222222222222";
  const pastedId = "pasted-text";

  it("collects enabled PDFs, images, and pasted text", () => {
    expect(
      collectEnabledManagedIds({
        pdfs: [
          { id: pdfId, enabled: true },
          { id: "disabled-pdf", enabled: false },
        ],
        images: [{ id: imageId, enabled: true }],
        includePastedText: true,
        pastedTextId: pastedId,
      }),
    ).toEqual([pdfId, imageId, pastedId]);
  });

  it("preserves selected image IDs when PDF selection changes", () => {
    const scope: RetrievalScope = {
      mode: "selected",
      currentDocumentId: pdfId,
      selectedDocumentIds: [pdfId, imageId],
    };

    // Simulate a PDF enable toggle that rebuilds the allowlist with both types.
    const enabledIds = collectEnabledManagedIds({
      pdfs: [{ id: pdfId, enabled: true }],
      images: [{ id: imageId, enabled: true }],
    });

    const next = pruneRetrievalScope(scope, enabledIds);
    expect(next.selectedDocumentIds).toEqual(
      expect.arrayContaining([pdfId, imageId]),
    );
    expect(
      resolveRetrievalDocumentIds(
        [
          { id: pdfId, enabled: true },
          { id: imageId, enabled: true },
        ],
        next,
      ),
    ).toEqual(expect.arrayContaining([pdfId, imageId]));
  });

  it("does not silently drop images when pruning against a full allowlist", () => {
    const pruned = pruneRetrievalScope(
      {
        mode: "selected",
        selectedDocumentIds: [imageId, pdfId],
      },
      [pdfId, imageId],
    );

    expect(pruned.selectedDocumentIds).toContain(imageId);
  });
});
