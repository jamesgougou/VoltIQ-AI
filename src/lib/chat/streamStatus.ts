export type StreamAriaStatus =
  | "idle"
  | "generating"
  | "stopped"
  | "timed_out"
  | "completed";

export function shouldShowTypingIndicator(
  isStreaming: boolean,
  hasReceivedAssistantToken: boolean,
): boolean {
  return isStreaming && !hasReceivedAssistantToken;
}

export function streamAriaStatusLabel(status: StreamAriaStatus): string {
  switch (status) {
    case "generating":
      return "Generating";
    case "stopped":
      return "Stopped";
    case "timed_out":
      return "Timed out";
    case "completed":
      return "Completed";
    default:
      return "";
  }
}

export function resolveStreamAriaStatus(options: {
  isStreaming: boolean;
  failureReason?: string | null;
  justCompleted?: boolean;
}): StreamAriaStatus {
  if (options.isStreaming) {
    return "generating";
  }
  if (options.failureReason === "cancelled") {
    return "stopped";
  }
  if (options.failureReason === "timeout") {
    return "timed_out";
  }
  if (options.justCompleted) {
    return "completed";
  }
  return "idle";
}
