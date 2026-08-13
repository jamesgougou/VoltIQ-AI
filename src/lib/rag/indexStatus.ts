import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { AsyncMutex } from "@/lib/rag/asyncMutex";
import { writeBytesAtomically } from "@/lib/rag/atomicWrite";
import { calculateStageProgress, estimateSecondsRemaining } from "@/lib/rag/indexProgress";
import { ragLog } from "@/lib/rag/logger";
import type { DocumentIndexState, DocumentIndexStatus, IndexStage } from "@/lib/rag/types";

const STORE_DIR = path.join(process.cwd(), ".voltiq");
const STATUS_FILE = path.join(STORE_DIR, "index-status.json");

type StatusSnapshot = Record<string, DocumentIndexState>;

function createEmptySnapshot(): StatusSnapshot {
  return {};
}

type ProgressUpdate = {
  stage: IndexStage;
  embeddedChunks?: number;
  totalChunks?: number;
};

export class IndexStatusStore {
  private snapshot: StatusSnapshot | null = null;
  private readonly writeLock = new AsyncMutex();
  private readonly statusFile: string;
  private readonly storeDir: string;

  constructor(statusFile: string = STATUS_FILE) {
    this.statusFile = statusFile;
    this.storeDir = path.dirname(statusFile);
  }

  private async loadSnapshot(): Promise<StatusSnapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    try {
      const raw = await readFile(this.statusFile, "utf8");
      this.snapshot = JSON.parse(raw) as StatusSnapshot;
      return this.snapshot;
    } catch {
      this.snapshot = createEmptySnapshot();
      return this.snapshot;
    }
  }

  private async persistSnapshot(snapshot: StatusSnapshot): Promise<void> {
    await mkdir(this.storeDir, { recursive: true });
    // Pretty JSON — preserve existing on-disk format.
    await writeBytesAtomically(
      this.statusFile,
      JSON.stringify(snapshot, null, 2),
      { encoding: "utf8", label: "index-status.json" },
    );
    this.snapshot = snapshot;
  }

  async setStatus(
    documentId: string,
    filename: string,
    status: DocumentIndexStatus,
    options?: {
      error?: string;
      chunkCount?: number;
      stage?: IndexStage;
      embeddedChunks?: number;
      totalChunks?: number;
    },
  ): Promise<DocumentIndexState> {
    return this.writeLock.runExclusive(async () => {
      const snapshot = await this.loadSnapshot();
      const previous = snapshot[documentId];
      const stage =
        options?.stage ??
        (status === "ready"
          ? "ready"
          : status === "failed"
            ? "failed"
            : (previous?.stage ?? "uploading"));
      const embeddedChunks = options?.embeddedChunks ?? previous?.embeddedChunks;
      const totalChunks =
        options?.totalChunks ?? options?.chunkCount ?? previous?.totalChunks;
      const progressPercent = calculateStageProgress(
        stage,
        embeddedChunks,
        totalChunks,
      );

      const nextState: DocumentIndexState = {
        documentId,
        filename,
        status,
        stage,
        error: options?.error,
        chunkCount: options?.chunkCount ?? previous?.chunkCount,
        embeddedChunks,
        totalChunks,
        progressPercent,
        startedAt:
          status === "indexing"
            ? (previous?.startedAt ?? new Date().toISOString())
            : previous?.startedAt,
        updatedAt: new Date().toISOString(),
      };

      nextState.estimatedSecondsRemaining =
        estimateSecondsRemaining(nextState) ?? undefined;

      snapshot[documentId] = nextState;
      await this.persistSnapshot(snapshot);

      ragLog(
        status === "ready" ? "ready" : status === "failed" ? "failed" : "upload",
        `Status transition for ${filename}: ${status} (${stage}, ${progressPercent}%)`,
      );

      return nextState;
    });
  }

  async updateProgress(
    documentId: string,
    progress: ProgressUpdate,
  ): Promise<DocumentIndexState | undefined> {
    return this.writeLock.runExclusive(async () => {
      const snapshot = await this.loadSnapshot();
      const current = snapshot[documentId];

      if (!current || current.status !== "indexing") {
        return current;
      }

      const embeddedChunks = progress.embeddedChunks ?? current.embeddedChunks;
      const totalChunks = progress.totalChunks ?? current.totalChunks;
      const progressPercent = calculateStageProgress(
        progress.stage,
        embeddedChunks,
        totalChunks,
      );

      const nextState: DocumentIndexState = {
        ...current,
        stage: progress.stage,
        embeddedChunks,
        totalChunks,
        progressPercent,
        updatedAt: new Date().toISOString(),
      };

      nextState.estimatedSecondsRemaining =
        estimateSecondsRemaining(nextState) ?? undefined;

      snapshot[documentId] = nextState;
      await this.persistSnapshot(snapshot);

      return nextState;
    });
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
    await this.writeLock.runExclusive(async () => {
      const snapshot = await this.loadSnapshot();

      if (!snapshot[documentId]) {
        return;
      }

      delete snapshot[documentId];
      await this.persistSnapshot(snapshot);
    });
  }

  async clearAll(): Promise<void> {
    await this.writeLock.runExclusive(async () => {
      await this.persistSnapshot(createEmptySnapshot());
    });
  }
}

let indexStatusStore: IndexStatusStore | null = null;

export function getIndexStatusStore(): IndexStatusStore {
  if (!indexStatusStore) {
    indexStatusStore = new IndexStatusStore();
  }

  return indexStatusStore;
}
