import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIApiKey(): string | undefined {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey || undefined;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

export function assertOpenAIConfigured(): string {
  const apiKey = getOpenAIApiKey();

  if (!apiKey) {
    console.error("OpenAI API key not found.");
    throw new Error("MISSING_OPENAI_API_KEY");
  }

  return apiKey;
}

export function getOpenAIClient(): OpenAI {
  const apiKey = assertOpenAIConfigured();

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

export function logOpenAIConfigStatus(): void {
  const apiKey = getOpenAIApiKey();
  const model = getOpenAIModel();

  if (!apiKey) {
    console.error("OpenAI API key not found.");
    return;
  }

  console.info(
    `OpenAI configured (model: ${model}, key: ${apiKey.slice(0, 7)}...).`,
  );
}
