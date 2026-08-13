import OpenAI from "openai";
import { validateChatPayload } from "@/lib/api/requestLimits";
import { buildSystemContent } from "@/lib/chat/buildPrompt";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { isSafeDocumentId } from "@/lib/rag/documentId";
import {
  RetrievalError,
  getDocumentIndexStatuses,
  hasIndexedContent,
  resolveIndexingGateMessage,
  retrieveWithHybridSearch,
} from "@/lib/rag/retrieve";
import { encodeSourcesTrailer } from "@/lib/rag/streamMetadata";
import { toSourceMetadata } from "@/lib/rag/types";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 60_000;

type ChatRequestMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatRequestMessage[];
  hasTextDocuments?: boolean;
  documentIds?: string[];
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function mapOpenAIError(error: unknown): { message: string; status: number } {
  if (error instanceof RetrievalError) {
    return {
      message: error.message,
      status: 503,
    };
  }

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

  const documentIds = body.documentIds?.filter(
    (documentId) =>
      typeof documentId === "string" &&
      documentId.trim().length > 0 &&
      isSafeDocumentId(documentId),
  );

  const limitError = validateChatPayload({
    messages: history,
    documentIds,
  });

  if (limitError) {
    return errorResponse(limitError, 400);
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

  if (body.hasTextDocuments && documentIds?.length) {
    const statuses = await getDocumentIndexStatuses(documentIds);
    const gateMessage = resolveIndexingGateMessage(documentIds, statuses);

    if (gateMessage) {
      const isFailed = statuses.some((status) => status.status === "failed");
      console.info(
        `[RAG:chat] Blocking chat (${isFailed ? "failed" : "indexing"}): ${gateMessage}`,
      );
      return errorResponse(gateMessage, isFailed ? 422 : 503);
    }
  } else if (body.hasTextDocuments && !(await hasIndexedContent())) {
    return errorResponse(
      "Your documents are still being indexed. Please wait a moment and try again.",
      503,
    );
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => abortController.abort(),
    REQUEST_TIMEOUT_MS,
  );

  const onClientAbort = () => {
    abortController.abort();
  };
  request.signal.addEventListener("abort", onClientAbort);

  try {
    const openai = getOpenAIClient();
    const retrieval = await retrieveWithHybridSearch(
      latestUserMessage.content.trim(),
      undefined,
      documentIds,
    );
    const retrievedChunks = retrieval.chunks;
    const sourceMetadata = toSourceMetadata(retrievedChunks);

    const stream = await openai.chat.completions.create(
      {
        model,
        stream: true,
        messages: [
          {
            role: "system",
            content: buildSystemContent(retrievedChunks, {
              insufficientRetrieval: retrieval.insufficientRetrieval,
            }),
          },
          ...history.map((message) => ({
            role: message.role,
            content: message.content.trim(),
          })),
        ],
      },
      { signal: abortController.signal },
    );

    const encoder = new TextEncoder();
    const sourcesTrailer = encodeSourcesTrailer(sourceMetadata);

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (abortController.signal.aborted) {
              break;
            }

            const text = chunk.choices[0]?.delta?.content;

            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }

          if (abortController.signal.aborted) {
            controller.error(
              Object.assign(new Error("The request timed out. Please try again."), {
                name: "AbortError",
              }),
            );
            return;
          }

          controller.enqueue(encoder.encode(sourcesTrailer));
          controller.close();
        } catch (error) {
          if (abortController.signal.aborted) {
            controller.error(
              Object.assign(new Error("The request timed out. Please try again."), {
                name: "AbortError",
              }),
            );
            return;
          }

          const mapped = mapOpenAIError(error);
          try {
            controller.enqueue(
              encoder.encode(`\n\n[${mapped.message}]`),
            );
            controller.close();
          } catch {
            controller.error(error);
          }
        } finally {
          clearTimeout(timeoutId);
          request.signal.removeEventListener("abort", onClientAbort);
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    request.signal.removeEventListener("abort", onClientAbort);
    const mapped = mapOpenAIError(error);
    return errorResponse(mapped.message, mapped.status);
  }
}
