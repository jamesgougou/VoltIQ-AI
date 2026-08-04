export type ChatApiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatApiDocument = {
  name: string;
  text: string;
  ocrText?: string;
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
  documents: ChatApiDocument[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
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
      body: JSON.stringify({ messages, documents }),
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
          errorMessage = "OpenAI API key is not configured.";
        } else if (response.status === 504) {
          errorMessage = "The request timed out. Please try again.";
        } else if (response.status === 422) {
          errorMessage =
            "Unable to extract readable text from the uploaded documents. Please upload a text-based PDF, paste the content directly, or try a different file.";
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

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      if (chunk) {
        onChunk(chunk);
      }
    }
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
