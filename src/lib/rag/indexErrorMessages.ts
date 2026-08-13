const FRIENDLY_BY_PATTERN: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /api key|OPENAI|unauthorized|401/i,
    message: "AI service is not configured. Check your API key and try again.",
  },
  {
    pattern: /timeout|timed out|ETIMEDOUT|504/i,
    message: "Indexing timed out. Please retry this document.",
  },
  {
    pattern: /cancelled|canceled|aborted/i,
    message: "Indexing was cancelled.",
  },
  {
    pattern: /network|fetch failed|ECONNREFUSED|ENOTFOUND/i,
    message: "Network error while indexing. Check your connection and retry.",
  },
  {
    pattern: /too large|payload|body|size|413/i,
    message: "This file is too large to index. Try a smaller document.",
  },
  {
    pattern: /unsupported|invalid (pdf|image|file)|corrupt/i,
    message: "This file could not be read. Try another file format.",
  },
  {
    pattern: /quota|rate limit|429/i,
    message: "AI service is busy. Wait a moment and retry.",
  },
];

export const DEFAULT_INDEX_ERROR_MESSAGE =
  "Unable to index this document. Please retry.";

/** Map raw indexer errors to concise user-facing copy. */
export function formatIndexErrorMessage(raw?: string | null): string {
  if (!raw?.trim()) {
    return DEFAULT_INDEX_ERROR_MESSAGE;
  }

  for (const entry of FRIENDLY_BY_PATTERN) {
    if (entry.pattern.test(raw)) {
      return entry.message;
    }
  }

  // Avoid dumping stacks / paths in the primary UI.
  if (raw.length > 160 || /at\s+\S+:\d+:\d+/.test(raw) || raw.includes("\n")) {
    return DEFAULT_INDEX_ERROR_MESSAGE;
  }

  return raw.trim();
}
