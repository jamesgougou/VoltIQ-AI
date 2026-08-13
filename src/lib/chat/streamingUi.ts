import { ChatStreamError } from "@/lib/chat/streamChat";

export type StreamUiState = {
  /** True from request start until stream settles (success or error). */
  isStreaming: boolean;
};

export function shouldShowStopControl(isStreaming: boolean): boolean {
  return isStreaming;
}

/** First chunk must not clear streaming — only settlement does. */
export function streamingFlagAfterChunk(isStreaming: boolean): boolean {
  return isStreaming;
}

export function formatStreamFailure(
  error: unknown,
  streamedContent: string,
): { message: string; preserveContent: boolean; reason: string } {
  if (error instanceof ChatStreamError) {
    if (error.reason === "cancelled") {
      return {
        message: streamedContent
          ? `${streamedContent}\n\n---\n\n_Response stopped._`
          : "The request was cancelled.",
        preserveContent: Boolean(streamedContent),
        reason: "cancelled",
      };
    }

    if (error.reason === "timeout") {
      return {
        message: streamedContent
          ? `${streamedContent}\n\n---\n\n**Error:** ${error.message}`
          : error.message,
        preserveContent: Boolean(streamedContent),
        reason: "timeout",
      };
    }

    return {
      message: streamedContent
        ? `${streamedContent}\n\n---\n\n**Error:** ${error.message}`
        : error.message,
      preserveContent: Boolean(streamedContent),
      reason: error.reason,
    };
  }

  const fallback =
    error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";

  return {
    message: streamedContent
      ? `${streamedContent}\n\n---\n\n**Error:** ${fallback}`
      : fallback,
    preserveContent: Boolean(streamedContent),
    reason: "unknown",
  };
}
