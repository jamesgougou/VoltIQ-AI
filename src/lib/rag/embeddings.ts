import { getOpenAIClient } from "@/lib/openai";

export function getEmbeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: getEmbeddingModel(),
    input: texts,
  });

  return response.data
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
