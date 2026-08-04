import { buildBM25Index, type BM25Index } from "@/lib/rag/bm25";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RetrievedChunk, StoredDocumentChunk } from "@/lib/rag/types";

type DocumentRecord = {
  documentId: string;
  filename: string;
  contentHash: string;
  chunkIds: string[];
};

type VectorStoreSnapshot = {
  chunks: StoredDocumentChunk[];
  documents: Record<string, DocumentRecord>;
};

const STORE_DIR = path.join(process.cwd(), ".voltiq");
const STORE_FILE = path.join(STORE_DIR, "rag-store.json");

function createEmptySnapshot(): VectorStoreSnapshot {
  return {
    chunks: [],
    documents: {},
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

function migrateSnapshot(snapshot: VectorStoreSnapshot): VectorStoreSnapshot {
  return {
    ...snapshot,
    chunks: snapshot.chunks.map((chunk, index) => {
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
    }),
    documents: Object.fromEntries(
      Object.entries(snapshot.documents).map(([key, record]) => {
        const legacy = record as DocumentRecord & { documentName?: string };

        return [
          key,
          {
            documentId: legacy.documentId,
            filename: legacy.filename ?? legacy.documentName ?? "Unknown document",
            contentHash: legacy.contentHash,
            chunkIds: legacy.chunkIds,
          },
        ];
      }),
    ),
  };
}

export class VectorStore {
  private snapshot: VectorStoreSnapshot | null = null;
  private bm25Index: BM25Index | null = null;
  private bm25Signature = "";

  private async loadSnapshot(): Promise<VectorStoreSnapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    try {
      const raw = await readFile(STORE_FILE, "utf8");
      const parsed = JSON.parse(raw) as VectorStoreSnapshot;
      this.snapshot = migrateSnapshot(parsed);
      return this.snapshot;
    } catch {
      this.snapshot = createEmptySnapshot();
      return this.snapshot;
    }
  }

  private async persistSnapshot(snapshot: VectorStoreSnapshot): Promise<void> {
    await mkdir(STORE_DIR, { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(snapshot, null, 2), "utf8");
    this.snapshot = snapshot;
    this.bm25Index = null;
    this.bm25Signature = "";
  }

  async getDocumentRecord(
    documentId: string,
  ): Promise<DocumentRecord | undefined> {
    const snapshot = await this.loadSnapshot();
    return snapshot.documents[documentId];
  }

  async insertChunks(
    documentId: string,
    filename: string,
    contentHash: string,
    chunks: StoredDocumentChunk[],
  ): Promise<void> {
    const snapshot = await this.loadSnapshot();
    const existing = snapshot.documents[documentId];

    if (existing?.contentHash === contentHash) {
      return;
    }

    if (existing) {
      snapshot.chunks = snapshot.chunks.filter(
        (chunk) => chunk.documentId !== documentId,
      );
    }

    snapshot.chunks.push(...chunks);
    snapshot.documents[documentId] = {
      documentId,
      filename,
      contentHash,
      chunkIds: chunks.map((chunk) => chunk.id),
    };

    await this.persistSnapshot(snapshot);
  }

  async deleteDocument(documentId: string): Promise<void> {
    const snapshot = await this.loadSnapshot();

    if (!snapshot.documents[documentId]) {
      return;
    }

    delete snapshot.documents[documentId];
    snapshot.chunks = snapshot.chunks.filter(
      (chunk) => chunk.documentId !== documentId,
    );

    await this.persistSnapshot(snapshot);
  }

  async rebuild(): Promise<void> {
    await this.persistSnapshot(createEmptySnapshot());
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
