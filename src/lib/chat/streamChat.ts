import type { RetrievedSourceMetadata } from "@/lib/rag/types";
import { stripSourcesMarkerFromStream } from "@/lib/rag/streamMetadata";

export type ChatApiMessage = {
  role: "user" | "assistant";
  content: string;
};

const STREAM_TIMEOUT_MS = 65_000;

export class ChatStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatStreamError";
  }
}

export async function streamChatResponse(
  messages: ChatApiMessage[],
  options: {
    hasTextDocuments: boolean;
    documentIds: string[];
    onChunk: (chunk: string) => void;
    onSources?: (sources: RetrievedSourceMetadata[]) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const { hasTextDocuments, documentIds, onChunk, onSources, signal } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  const abortFromParent = () => controller.abort();
  signal?.addEventListener("abort", abortFromParent);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, hasTextDocuments, documentIds }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = "Something went wrong. Please try again.";

      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          errorMessage = payload.error;
        }
      } catch {
        if (response.status === 401) {
          errorMessage = "Your OpenAI API key appears to be invalid.";
        } else if (response.status === 503) {
          errorMessage =
            "OpenAI API key is not configured, or your documents are still being indexed. Please try again shortly.";
        } else if (response.status === 504) {
          errorMessage = "The request timed out. Please try again.";
        } else if (response.status === 422) {
          errorMessage =
            "Document indexing failed. Please review the upload and try again.";
        }
      }

      throw new ChatStreamError(errorMessage);
    }

    if (!response.body) {
      throw new ChatStreamError(
        "Unable to reach VoltIQ AI. Please check your connection and try again.",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let emittedLength = 0;
    let sources: RetrievedSourceMetadata[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      accumulated += decoder.decode(value, { stream: true });

      const parsed = stripSourcesMarkerFromStream(accumulated, emittedLength);

      if (parsed.emitted) {
        onChunk(parsed.emitted);
      }

      emittedLength = parsed.nextEmittedLength;

      if (parsed.complete) {
        sources = parsed.sources;
        break;
      }
    }

    accumulated += decoder.decode();

    const finalParsed = stripSourcesMarkerFromStream(accumulated, emittedLength);

    if (finalParsed.emitted) {
      onChunk(finalParsed.emitted);
    }

    if (finalParsed.sources.length > 0) {
      sources = finalParsed.sources;
    }

    onSources?.(sources);
  } catch (error) {
    if (error instanceof ChatStreamError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ChatStreamError("The request timed out. Please try again.");
    }

    throw new ChatStreamError(
      "Unable to reach VoltIQ AI. Please check your connection and try again.",
    );
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromParent);
  }
}
