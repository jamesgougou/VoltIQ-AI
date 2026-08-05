import { buildBM25Index, type BM25Index } from "@/lib/rag/bm25";
import { AsyncMutex } from "@/lib/rag/asyncMutex";
import {
  StorageWriteError,
  renameWithRetry,
  writeFileAtomically,
} from "@/lib/rag/atomicWrite";
import { assertNotCancelled } from "@/lib/rag/indexCancellation";
import { constants as bufferConstants } from "node:buffer";
import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";
import type { RetrievedChunk, StoredDocumentChunk } from "@/lib/rag/types";

const MAX_STRING_LENGTH = bufferConstants.MAX_STRING_LENGTH;

export type DocumentRecord = {
  documentId: string;
  filename: string;
  contentHash: string;
  chunkIds: string[];
  fileSize?: number;
  totalPages?: number;
  indexedAt?: string;
  hasPdf?: boolean;
};

export type DocumentRecordInput = {
  fileSize?: number;
  totalPages?: number;
  indexedAt?: string;
  hasPdf?: boolean;
};

type VectorStoreSnapshot = {
  chunks: StoredDocumentChunk[];
  documents: Record<string, DocumentRecord>;
};

type MetaSnapshot = {
  version: 2;
  documents: Record<string, DocumentRecord>;
};

const STORE_DIR = path.join(process.cwd(), ".voltiq");
/** @deprecated Monolithic pretty JSON — caused RangeError: Invalid string length. */
const LEGACY_STORE_FILE = path.join(STORE_DIR, "rag-store.json");
const META_FILE = path.join(STORE_DIR, "rag-meta.json");
const CHUNKS_FILE = path.join(STORE_DIR, "rag-chunks.ndjson");

function createEmptySnapshot(): VectorStoreSnapshot {
  return {
    chunks: [],
    documents: {},
  };
}

function cloneSnapshot(snapshot: VectorStoreSnapshot): VectorStoreSnapshot {
  return {
    documents: structuredClone(snapshot.documents),
    chunks: snapshot.chunks.slice(),
  };
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function migrateChunk(
  chunk: StoredDocumentChunk,
  index: number,
): StoredDocumentChunk {
  const legacy = chunk as StoredDocumentChunk & {
    documentName?: string;
    pageNumber?: number;
    score?: number;
  };

  return {
    id: legacy.id,
    documentId: legacy.documentId,
    filename: legacy.filename ?? legacy.documentName ?? "Unknown document",
    page: legacy.page ?? legacy.pageNumber,
    chunkIndex: legacy.chunkIndex ?? index,
    text: legacy.text,
    embedding: legacy.embedding,
  };
}

function migrateDocuments(
  documents: Record<string, DocumentRecord>,
): Record<string, DocumentRecord> {
  return Object.fromEntries(
    Object.entries(documents).map(([key, record]) => {
      const legacy = record as DocumentRecord & { documentName?: string };

      return [
        key,
        {
          documentId: legacy.documentId,
          filename: legacy.filename ?? legacy.documentName ?? "Unknown document",
          contentHash: legacy.contentHash,
          chunkIds: legacy.chunkIds,
          fileSize: legacy.fileSize,
          totalPages: legacy.totalPages,
          indexedAt: legacy.indexedAt,
          hasPdf: legacy.hasPdf,
        },
      ];
    }),
  );
}

function migrateSnapshot(snapshot: VectorStoreSnapshot): VectorStoreSnapshot {
  return {
    chunks: snapshot.chunks.map((chunk, index) => migrateChunk(chunk, index)),
    documents: migrateDocuments(snapshot.documents),
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist chunks as NDJSON — one compact JSON object per line, via a unique
 * temp file + rename after the write handle is fully closed.
 */
async function writeChunksNdjson(chunks: StoredDocumentChunk[]): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });

  await writeFileAtomically(CHUNKS_FILE, async (writeLine) => {
    for (const chunk of chunks) {
      await writeLine(`${JSON.stringify(chunk)}\n`);
    }
  });
}

async function readChunksNdjson(): Promise<StoredDocumentChunk[]> {
  if (!(await pathExists(CHUNKS_FILE))) {
    return [];
  }

  const chunks: StoredDocumentChunk[] = [];
  const readline = createInterface({
    input: createReadStream(CHUNKS_FILE, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let index = 0;

  for await (const line of readline) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = JSON.parse(trimmed) as StoredDocumentChunk;
    chunks.push(migrateChunk(parsed, index));
    index += 1;
  }

  return chunks;
}

async function writeMeta(documents: Record<string, DocumentRecord>): Promise<void> {
  const meta: MetaSnapshot = {
    version: 2,
    documents,
  };

  await mkdir(STORE_DIR, { recursive: true });
  // Meta is tiny (document records only) — safe to stringify.
  const tempPath = path.join(
    STORE_DIR,
    `rag-meta.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    await writeFile(tempPath, JSON.stringify(meta, null, 2), "utf8");
    await renameWithRetry(tempPath, META_FILE, { label: "rag-meta.json" });
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

async function readMeta(): Promise<Record<string, DocumentRecord>> {
  if (!(await pathExists(META_FILE))) {
    return {};
  }

  const raw = await readFile(META_FILE, "utf8");
  const parsed = JSON.parse(raw) as MetaSnapshot | VectorStoreSnapshot;

  if ("documents" in parsed && parsed.documents) {
    return migrateDocuments(parsed.documents);
  }

  return {};
}

/**
 * One-time migration from legacy monolithic rag-store.json.
 * That format used JSON.stringify(snapshot, null, 2) and hit V8's max string length.
 */
async function migrateLegacyStoreIfNeeded(): Promise<VectorStoreSnapshot | null> {
  if (!(await pathExists(LEGACY_STORE_FILE))) {
    return null;
  }

  // Prefer new format if already present.
  if ((await pathExists(META_FILE)) && (await pathExists(CHUNKS_FILE))) {
    await unlink(LEGACY_STORE_FILE).catch(() => undefined);
    return null;
  }

  const fileStat = await stat(LEGACY_STORE_FILE);
  const maxSafeBytes = Math.min(
    Math.floor(MAX_STRING_LENGTH * 0.5),
    200 * 1024 * 1024,
  );

  if (fileStat.size > maxSafeBytes) {
    const quarantine = path.join(
      STORE_DIR,
      `rag-store.oversized-${Date.now()}.json.bak`,
    );
    console.warn(
      `[RAG:store] Legacy rag-store.json is ${(fileStat.size / 1024 / 1024).toFixed(1)} MB (V8 max string ~${(MAX_STRING_LENGTH / 1024 / 1024).toFixed(0)} MB). Quarantining to ${path.basename(quarantine)} and starting a fresh NDJSON store. Re-upload documents to re-index.`,
    );
    await rename(LEGACY_STORE_FILE, quarantine);
    return createEmptySnapshot();
  }

  console.info(
    `[RAG:store] Migrating legacy rag-store.json (${(fileStat.size / 1024 / 1024).toFixed(1)} MB) to NDJSON chunk store.`,
  );

  const raw = await readFile(LEGACY_STORE_FILE, "utf8");
  const parsed = JSON.parse(raw) as VectorStoreSnapshot;
  const migrated = migrateSnapshot(parsed);

  await writeMeta(migrated.documents);
  await writeChunksNdjson(migrated.chunks);
  await unlink(LEGACY_STORE_FILE).catch(() => undefined);

  return migrated;
}

export class VectorStore {
  private snapshot: VectorStoreSnapshot | null = null;
  private bm25Index: BM25Index | null = null;
  private bm25Signature = "";
  /** Ensures only one disk write (and snapshot mutation) runs at a time. */
  private readonly writeLock = new AsyncMutex();

  private async loadSnapshotUnlocked(): Promise<VectorStoreSnapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    console.info("[RAG] Opening storage...");

    try {
      const migrated = await migrateLegacyStoreIfNeeded();
      if (migrated) {
        this.snapshot = migrated;
        console.info("[RAG] Storage ready.");
        return this.snapshot;
      }

      if ((await pathExists(META_FILE)) || (await pathExists(CHUNKS_FILE))) {
        const documents = await readMeta();
        const chunks = await readChunksNdjson();
        this.snapshot = { documents, chunks };
        console.info("[RAG] Storage ready.");
        return this.snapshot;
      }

      this.snapshot = createEmptySnapshot();
      console.info("[RAG] Storage ready.");
      return this.snapshot;
    } catch (error) {
      console.error("[RAG:store] Failed to load vector store:", error);
      this.snapshot = createEmptySnapshot();
      console.info("[RAG] Storage ready.");
      return this.snapshot;
    }
  }

  private async loadSnapshot(): Promise<VectorStoreSnapshot> {
    // Reads of the in-memory snapshot are lock-free after first load.
    // Initial load is serialized through the write lock so it cannot race a writer.
    if (this.snapshot) {
      return this.snapshot;
    }

    return this.writeLock.runExclusive(() => this.loadSnapshotUnlocked());
  }

  /**
   * Persist a cloned snapshot. On failure the previous in-memory snapshot
   * (and on-disk files) are left unchanged.
   */
  private async persistSnapshot(next: VectorStoreSnapshot): Promise<void> {
    await writeMeta(next.documents);
    await writeChunksNdjson(next.chunks);

    if (await pathExists(LEGACY_STORE_FILE)) {
      await unlink(LEGACY_STORE_FILE).catch(() => undefined);
    }

    this.snapshot = next;
    this.bm25Index = null;
    this.bm25Signature = "";
    console.info("[RAG] Storage ready.");
  }

  private async mutateExclusive(
    mutate: (draft: VectorStoreSnapshot) => void | Promise<void>,
  ): Promise<void> {
    await this.writeLock.runExclusive(async () => {
      const current = await this.loadSnapshotUnlocked();
      const draft = cloneSnapshot(current);

      try {
        await mutate(draft);
        await this.persistSnapshot(draft);
      } catch (error) {
        // Keep previous index intact — do not assign draft to this.snapshot.
        if (error instanceof StorageWriteError) {
          throw error;
        }

        throw new StorageWriteError(
          "Unable to update local document storage. Please try again in a moment.",
          { cause: error },
        );
      }
    });
  }

  async getDocumentRecord(
    documentId: string,
  ): Promise<DocumentRecord | undefined> {
    const snapshot = await this.loadSnapshot();
    return snapshot.documents[documentId];
  }

  async listDocumentRecords(): Promise<DocumentRecord[]> {
    const snapshot = await this.loadSnapshot();
    return Object.values(snapshot.documents);
  }

  async findDocumentByContentHash(
    contentHash: string,
  ): Promise<DocumentRecord | undefined> {
    const snapshot = await this.loadSnapshot();
    return Object.values(snapshot.documents).find(
      (record) => record.contentHash === contentHash,
    );
  }

  async updateDocumentRecord(
    documentId: string,
    patch: Partial<DocumentRecord>,
  ): Promise<void> {
    await this.mutateExclusive((draft) => {
      const existing = draft.documents[documentId];

      if (!existing) {
        return;
      }

      draft.documents[documentId] = {
        ...existing,
        ...patch,
        documentId,
      };
    });
  }

  async insertChunks(
    documentId: string,
    filename: string,
    contentHash: string,
    chunks: StoredDocumentChunk[],
    meta?: DocumentRecordInput,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.mutateExclusive((draft) => {
      // Re-check after acquiring the write lock so a delete/cancel that won
      // the race cannot be overwritten by a stale index write.
      assertNotCancelled(signal);

      const existing = draft.documents[documentId];

      if (existing?.contentHash === contentHash) {
        if (meta) {
          draft.documents[documentId] = {
            ...existing,
            ...meta,
            filename: filename || existing.filename,
          };
        }
        return;
      }

      if (existing) {
        draft.chunks = draft.chunks.filter(
          (chunk) => chunk.documentId !== documentId,
        );
      }

      draft.chunks.push(...chunks);
      draft.documents[documentId] = {
        documentId,
        filename,
        contentHash,
        chunkIds: chunks.map((chunk) => chunk.id),
        fileSize: meta?.fileSize ?? existing?.fileSize,
        totalPages: meta?.totalPages ?? existing?.totalPages,
        indexedAt: meta?.indexedAt ?? new Date().toISOString(),
        hasPdf: meta?.hasPdf ?? existing?.hasPdf,
      };
    });
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.mutateExclusive((draft) => {
      if (!draft.documents[documentId]) {
        return;
      }

      delete draft.documents[documentId];
      draft.chunks = draft.chunks.filter(
        (chunk) => chunk.documentId !== documentId,
      );
    });
  }

  async rebuild(): Promise<void> {
    await this.mutateExclusive((draft) => {
      draft.chunks = [];
      draft.documents = {};
    });
  }

  async similaritySearch(
    queryEmbedding: number[],
    topK: number,
  ): Promise<RetrievedChunk[]> {
    const snapshot = await this.loadSnapshot();

    return snapshot.chunks
      .map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        filename: chunk.filename,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        similarityScore: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, topK);
  }

  async hasIndexedContent(): Promise<boolean> {
    const snapshot = await this.loadSnapshot();
    return snapshot.chunks.length > 0;
  }

  async verifyDocumentStorage(
    documentId: string,
    expectedChunkCount: number,
  ): Promise<void> {
    const snapshot = await this.loadSnapshot();
    const record = snapshot.documents[documentId];

    if (!record) {
      throw new Error(
        `Storage verification failed: no document record for ${documentId}.`,
      );
    }

    if (record.chunkIds.length !== expectedChunkCount) {
      throw new Error(
        `Storage verification failed: expected ${expectedChunkCount} chunk ids, found ${record.chunkIds.length}.`,
      );
    }

    const storedChunks = snapshot.chunks.filter(
      (chunk) => chunk.documentId === documentId,
    );

    if (storedChunks.length !== expectedChunkCount) {
      throw new Error(
        `Storage verification failed: expected ${expectedChunkCount} stored chunks, found ${storedChunks.length}.`,
      );
    }

    for (const chunk of storedChunks) {
      if (!chunk.embedding?.length) {
        throw new Error(
          `Storage verification failed: chunk ${chunk.id} is missing its embedding vector.`,
        );
      }
    }
  }

  async getStoredChunkCount(documentId: string): Promise<number> {
    const snapshot = await this.loadSnapshot();
    return snapshot.chunks.filter((chunk) => chunk.documentId === documentId)
      .length;
  }

  async getAllChunks(): Promise<StoredDocumentChunk[]> {
    const snapshot = await this.loadSnapshot();
    return snapshot.chunks;
  }

  async getBM25Index(): Promise<BM25Index> {
    const snapshot = await this.loadSnapshot();
    const signature = `${snapshot.chunks.length}:${snapshot.chunks[0]?.id ?? ""}:${snapshot.chunks.at(-1)?.id ?? ""}`;

    if (this.bm25Index && this.bm25Signature === signature) {
      return this.bm25Index;
    }

    this.bm25Index = buildBM25Index(snapshot.chunks);
    this.bm25Signature = signature;
    return this.bm25Index;
  }
}

let vectorStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    vectorStore = new VectorStore();
  }

  return vectorStore;
}

export async function resetVectorStoreForTests(): Promise<void> {
  vectorStore = new VectorStore();
  await vectorStore.rebuild();
}

export { StorageWriteError };
