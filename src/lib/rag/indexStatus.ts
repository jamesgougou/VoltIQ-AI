import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DocumentIndexState, DocumentIndexStatus } from "@/lib/rag/types";
import { ragLog } from "@/lib/rag/logger";

const STORE_DIR = path.join(process.cwd(), ".voltiq");
const STATUS_FILE = path.join(STORE_DIR, "index-status.json");

type StatusSnapshot = Record<string, DocumentIndexState>;

function createEmptySnapshot(): StatusSnapshot {
  return {};
}

export class IndexStatusStore {
  private snapshot: StatusSnapshot | null = null;

  private async loadSnapshot(): Promise<StatusSnapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    try {
      const raw = await readFile(STATUS_FILE, "utf8");
      this.snapshot = JSON.parse(raw) as StatusSnapshot;
      return this.snapshot;
    } catch {
      this.snapshot = createEmptySnapshot();
      return this.snapshot;
    }
  }

  private async persistSnapshot(snapshot: StatusSnapshot): Promise<void> {
    await mkdir(STORE_DIR, { recursive: true });
    await writeFile(STATUS_FILE, JSON.stringify(snapshot, null, 2), "utf8");
    this.snapshot = snapshot;
  }

  async setStatus(
    documentId: string,
    filename: string,
    status: DocumentIndexStatus,
    options?: {
      error?: string;
      chunkCount?: number;
    },
  ): Promise<DocumentIndexState> {
    const snapshot = await this.loadSnapshot();
    const nextState: DocumentIndexState = {
      documentId,
      filename,
      status,
      error: options?.error,
      chunkCount: options?.chunkCount,
      updatedAt: new Date().toISOString(),
    };

    snapshot[documentId] = nextState;
    await this.persistSnapshot(snapshot);

    console.info(
      `[RAG] Status ${documentId} (${filename}): ${status}${
        options?.error ? ` - ${options.error}` : ""
      }`,
    );

    ragLog(
      status === "ready" ? "ready" : status === "failed" ? "failed" : "upload",
      `Status transition for ${filename}: ${status}${
        options?.chunkCount ? ` (${options.chunkCount} chunks)` : ""
      }${options?.error ? ` - ${options.error}` : ""}`,
    );

    return nextState;
  }

  async getStatus(documentId: string): Promise<DocumentIndexState | undefined> {
    const snapshot = await this.loadSnapshot();
    return snapshot[documentId];
  }

  async getStatuses(documentIds: string[]): Promise<DocumentIndexState[]> {
    const snapshot = await this.loadSnapshot();
    return documentIds
      .map((documentId) => snapshot[documentId])
      .filter((state): state is DocumentIndexState => Boolean(state));
  }

  async getAllStatuses(): Promise<DocumentIndexState[]> {
    const snapshot = await this.loadSnapshot();
    return Object.values(snapshot);
  }

  async removeStatus(documentId: string): Promise<void> {
    const snapshot = await this.loadSnapshot();

    if (!snapshot[documentId]) {
      return;
    }

    delete snapshot[documentId];
    await this.persistSnapshot(snapshot);
  }

  async clearAll(): Promise<void> {
    await this.persistSnapshot(createEmptySnapshot());
  }
}

let indexStatusStore: IndexStatusStore | null = null;

export function getIndexStatusStore(): IndexStatusStore {
  if (!indexStatusStore) {
    indexStatusStore = new IndexStatusStore();
  }

  return indexStatusStore;
}
