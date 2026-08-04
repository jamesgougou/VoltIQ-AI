import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai";
import {
  assertNotCancelled,
  IndexCancelledError,
} from "@/lib/rag/indexCancellation";
import { ragLog } from "@/lib/rag/logger";
import { EMBED_BATCH_SIZE } from "@/lib/rag/types";

const ALLOWED_EMBEDDING_MODELS = [
  "text-embedding-3-small",
  "text-embedding-3-large",
] as const;

export function getEmbeddingModel(): string {
  const configured = process.env.OPENAI_EMBEDDING_MODEL?.trim();

  if (
    configured &&
    ALLOWED_EMBEDDING_MODELS.includes(
      configured as (typeof ALLOWED_EMBEDDING_MODELS)[number],
    )
  ) {
    return configured;
  }

  if (configured) {
    console.warn(
      `[RAG] Invalid embedding model "${configured}". Embeddings must use text-embedding-3-small or text-embedding-3-large. Falling back to text-embedding-3-small.`,
    );
  }

  return "text-embedding-3-small";
}

export function formatEmbeddingError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return error.message || `OpenAI embedding error (${error.status ?? "unknown"}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to generate embeddings for this document.";
}

export async function embedTexts(
  texts: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  assertNotCancelled(signal);

  const openai = getOpenAIClient();
  const model = getEmbeddingModel();

  ragLog("embed", `Calling OpenAI embeddings API (${model}, batch=${texts.length}).`);

  try {
    const response = await openai.embeddings.create(
      {
        model,
        input: texts,
      },
      signal ? { signal } : undefined,
    );

    return response.data
      .sort((left, right) => left.index - right.index)
      .map((item) => item.embedding);
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new IndexCancelledError();
    }

    throw error;
  }
}

export async function embedTextsInBatches(
  texts: string[],
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal,
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const embeddings: number[][] = [];
  const total = texts.length;

  for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
    assertNotCancelled(signal);

    const batch = texts.slice(start, start + EMBED_BATCH_SIZE);
    const batchEmbeddings = await embedTexts(batch, signal);
    embeddings.push(...batchEmbeddings);

    onProgress?.(Math.min(start + batch.length, total), total);
  }

  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);

  if (!embedding) {
    throw new Error("EMBEDDING_FAILED");
  }

  return embedding;
}
