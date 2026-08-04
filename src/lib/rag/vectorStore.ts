import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RetrievedChunk, StoredDocumentChunk } from "@/types/rag";

type DocumentRecord = {
  documentId: string;
  documentName: string;
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

class LocalVectorStore {
  private snapshot: VectorStoreSnapshot | null = null;

  private async loadSnapshot(): Promise<VectorStoreSnapshot> {
    if (this.snapshot) {
      return this.snapshot;
    }

    try {
      const raw = await readFile(STORE_FILE, "utf8");
      this.snapshot = JSON.parse(raw) as VectorStoreSnapshot;
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
  }

  async getDocumentRecord(
    documentId: string,
  ): Promise<DocumentRecord | undefined> {
    const snapshot = await this.loadSnapshot();
    return snapshot.documents[documentId];
  }

  async insertChunks(
    documentId: string,
    documentName: string,
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
      documentName,
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
        documentName: chunk.documentName,
        pageNumber: chunk.pageNumber,
        text: chunk.text,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  async hasIndexedContent(): Promise<boolean> {
    const snapshot = await this.loadSnapshot();
    return snapshot.chunks.length > 0;
  }
}

let vectorStore: LocalVectorStore | null = null;

export function getVectorStore(): LocalVectorStore {
  if (!vectorStore) {
    vectorStore = new LocalVectorStore();
  }

  return vectorStore;
}

export async function resetVectorStoreForTests(): Promise<void> {
  vectorStore = new LocalVectorStore();
  await vectorStore.rebuild();
}
