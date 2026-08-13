import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeBytesAtomically } from "./atomicWrite";
import { IndexStatusStore } from "./indexStatus";
import {
  deleteLibraryDocument,
  readLibraryExtracted,
  saveLibraryExtracted,
} from "./libraryStore";

describe("writeBytesAtomically", () => {
  let dir: string;

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("leaves valid complete JSON at the destination after write", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "voltiq-atomic-"));
    const destination = path.join(dir, "status.json");
    const payload = { ok: true, count: 2 };

    await writeBytesAtomically(
      destination,
      JSON.stringify(payload, null, 2),
      { encoding: "utf8" },
    );

    const raw = await readFile(destination, "utf8");
    expect(JSON.parse(raw)).toEqual(payload);
    expect(raw.includes("\n")).toBe(true);
  });
});

describe("IndexStatusStore concurrent updates", () => {
  let dir: string;
  let statusFile: string;

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("serializes concurrent status updates and keeps valid JSON", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "voltiq-status-"));
    statusFile = path.join(dir, "index-status.json");
    const store = new IndexStatusStore(statusFile);
    const documentId = "33333333-3333-4333-8333-333333333333";

    await store.setStatus(documentId, "doc.pdf", "indexing", {
      stage: "embedding",
      embeddedChunks: 0,
      totalChunks: 10,
    });

    await Promise.all([
      store.updateProgress(documentId, {
        stage: "embedding",
        embeddedChunks: 3,
        totalChunks: 10,
      }),
      store.updateProgress(documentId, {
        stage: "embedding",
        embeddedChunks: 7,
        totalChunks: 10,
      }),
      store.setStatus(documentId, "doc.pdf", "ready", {
        stage: "ready",
        chunkCount: 10,
        totalChunks: 10,
      }),
    ]);

    const raw = await readFile(statusFile, "utf8");
    const parsed = JSON.parse(raw) as Record<string, { status: string }>;
    expect(parsed[documentId]?.status).toBe("ready");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe("library extracted metadata round-trip", () => {
  const documentId = "44444444-4444-4444-8444-444444444444";

  afterEach(async () => {
    await deleteLibraryDocument(documentId).catch(() => undefined);
  });

  it("preserves compact extracted metadata", async () => {
    const payload = {
      documentId,
      filename: "AS3000.pdf",
      contentHash: "abc123",
      fileSize: 12,
      totalPages: 1,
      indexedAt: "2026-01-01T00:00:00.000Z",
      text: "Clause 2.5",
      pages: [{ pageNumber: 1, text: "Clause 2.5" }],
      sourceKind: "pdf" as const,
    };

    await saveLibraryExtracted(payload);
    const read = await readLibraryExtracted(documentId);
    expect(read).toEqual(payload);
  });
});
