import type {
  DocumentIndexState,
  IndexDocumentRequest,
  IndexDocumentResult,
  PdfPageText,
} from "@/types/rag";

const INDEX_REQUEST_TIMEOUT_MS = 5 * 60 * 1000;
const STATUS_POLL_INTERVAL_MS = 2_000;

export function buildIndexRequest(input: {
  documentId: string;
  documentName: string;
  text: string;
  pages?: PdfPageText[];
  contentHash: string;
}): IndexDocumentRequest {
  const hasPages = Boolean(input.pages?.length);

  return {
    documentId: input.documentId,
    documentName: input.documentName,
    contentHash: input.contentHash,
    pages: hasPages ? input.pages : undefined,
    text: hasPages ? "" : input.text,
  };
}

export async function hashDocumentContent(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);

  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return `${content.length}:${content.slice(0, 128)}`;
}

export async function indexDocumentInRag(
  request: IndexDocumentRequest,
): Promise<IndexDocumentResult> {
  const payload = buildIndexRequest(request);
  const pageCount = payload.pages?.length ?? 0;
  const textLength = payload.text.length;

  console.info(
    `[RAG:client] Uploading document ${payload.documentName} (pages=${pageCount}, textLength=${textLength}).`,
  );

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    INDEX_REQUEST_TIMEOUT_MS,
  );

  let response: Response;

  try {
    response = await fetch("/api/rag/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Document indexing timed out before completion. Remove the document and upload again.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const result = (await response.json().catch(() => null)) as
    | IndexDocumentResult
    | { error?: string }
    | null;

  if (!response.ok || !result || !("status" in result)) {
    throw new Error(
      result && "error" in result && result.error
        ? result.error
        : "Unable to index the uploaded document for retrieval.",
    );
  }

  console.info(
    `[RAG:client] Index result for ${payload.documentName}: ${result.status} (${result.chunkCount} chunks).`,
  );

  if (result.status === "failed") {
    throw new Error(
      result.error ?? "Unable to generate embeddings for this document.",
    );
  }

  return result;
}

export async function fetchDocumentIndexStatuses(
  documentIds: string[],
): Promise<DocumentIndexState[]> {
  if (documentIds.length === 0) {
    return [];
  }

  const response = await fetch(
    `/api/rag/status?documentIds=${encodeURIComponent(documentIds.join(","))}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    console.warn("[RAG:client] Failed to fetch document index statuses.");
    return [];
  }

  const payload = (await response.json()) as { statuses?: DocumentIndexState[] };
  return payload.statuses ?? [];
}

export function mergeIndexStates(
  localStates: Record<string, DocumentIndexState | undefined>,
  serverStates: DocumentIndexState[],
): Record<string, DocumentIndexState> {
  const merged: Record<string, DocumentIndexState> = {};

  for (const [documentId, state] of Object.entries(localStates)) {
    if (state) {
      merged[documentId] = state;
    }
  }

  for (const state of serverStates) {
    const existing = merged[state.documentId];

    if (!existing) {
      merged[state.documentId] = state;
      continue;
    }

    if (
      existing.status === "indexing" &&
      (state.status === "ready" || state.status === "failed")
    ) {
      merged[state.documentId] = state;
      continue;
    }

    if (state.updatedAt >= existing.updatedAt) {
      merged[state.documentId] = state;
    }
  }

  return merged;
}

export async function waitForDocumentIndex(
  documentId: string,
  onUpdate?: (state: DocumentIndexState) => void,
): Promise<DocumentIndexState> {
  while (true) {
    const [status] = await fetchDocumentIndexStatuses([documentId]);

    if (status) {
      onUpdate?.(status);

      if (status.status === "ready" || status.status === "failed") {
        return status;
      }
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, STATUS_POLL_INTERVAL_MS);
    });
  }
}

export async function deleteDocumentFromRag(documentId: string): Promise<void> {
  const response = await fetch("/api/rag/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(payload?.error || "Unable to remove the document index.");
  }
}

export async function clearRagIndex(): Promise<void> {
  const response = await fetch("/api/rag/clear", {
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(payload?.error || "Unable to clear the document index.");
  }
}

export function resolveClientIndexingGateMessage(
  documents: Array<{ id: string; name: string }>,
  indexStates: Record<string, DocumentIndexState | undefined>,
): string | null {
  if (documents.length === 0) {
    return null;
  }

  const failed: DocumentIndexState[] = [];
  const ready: DocumentIndexState[] = [];

  for (const document of documents) {
    const status = indexStates[document.id];

    if (!status || status.status === "indexing") {
      return "Your documents are still being indexed. Please wait a moment and try again.";
    }

    if (status.status === "failed") {
      failed.push(status);
      continue;
    }

    if (status.status === "ready") {
      ready.push(status);
    }
  }

  if (failed.length > 0 && ready.length === 0) {
    return failed
      .map((status) => `${status.filename}: ${status.error ?? "Indexing failed."}`)
      .join("\n");
  }

  return null;
}
