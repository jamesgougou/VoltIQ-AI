import OpenAI from "openai";
import { buildSystemContent, getDocumentExtractionError } from "@/lib/chat/buildPrompt";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import type { DocumentContextItem } from "@/types/documentContext";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 60_000;

type ChatRequestMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatRequestMessage[];
  documents?: DocumentContextItem[];
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function mapOpenAIError(error: unknown): { message: string; status: number } {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return {
        message: "Your OpenAI API key appears to be invalid.",
        status: 401,
      };
    }

    if (error.status === 429) {
      return {
        message: "OpenAI rate limit reached. Please wait a moment and try again.",
        status: 429,
      };
    }

    return {
      message:
        error.message ||
        "OpenAI returned an unexpected error. Please try again.",
      status: error.status ?? 502,
    };
  }

  if (error instanceof Error) {
    if (
      error.message === "MISSING_OPENAI_API_KEY" ||
      error.message === "MISSING_API_KEY"
    ) {
      return {
        message: "OpenAI API key is not configured.",
        status: 503,
      };
    }

    if (error.name === "AbortError") {
      return {
        message: "The request timed out. Please try again.",
        status: 504,
      };
    }

    if (
      error.message.includes("fetch failed") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND")
    ) {
      return {
        message:
          "Unable to reach VoltIQ AI. Please check your connection and try again.",
        status: 503,
      };
    }
  }

  return {
    message: "Something went wrong. Please try again.",
    status: 500,
  };
}

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const history = body.messages?.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0,
  );

  if (!history?.length) {
    return errorResponse("A message is required.", 400);
  }

  const latestUserMessage = [...history]
    .reverse()
    .find((message) => message.role === "user");

  if (!latestUserMessage) {
    return errorResponse("A user message is required.", 400);
  }

  const documents = body.documents?.filter(
    (document) =>
      typeof document.name === "string" &&
      document.name.trim().length > 0 &&
      (typeof document.text === "string" || typeof document.ocrText === "string"),
  );

  const extractionError = getDocumentExtractionError(documents);
  if (extractionError) {
    return errorResponse(extractionError, 422);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.error("OpenAI API key not found.");
    return errorResponse("OpenAI API key is not configured.", 503);
  }

  const model = getOpenAIModel();

  if (!process.env.OPENAI_MODEL?.trim()) {
    console.info(`OPENAI_MODEL not set. Using default model: ${model}.`);
  }

  try {
    const openai = getOpenAIClient();

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    const stream = await openai.chat.completions.create(
      {
        model,
        stream: true,
        messages: [
          { role: "system", content: buildSystemContent(documents ?? []) },
          ...history.map((message) => ({
            role: message.role,
            content: message.content.trim(),
          })),
        ],
      },
      { signal: abortController.signal },
    );

    clearTimeout(timeoutId);

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;

            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const mapped = mapOpenAIError(error);
    return errorResponse(mapped.message, mapped.status);
  }
}
