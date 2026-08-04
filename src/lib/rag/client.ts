import type { IndexDocumentRequest } from "@/types/rag";

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
): Promise<void> {
  const response = await fetch("/api/rag/index", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      payload?.error ||
        "Unable to index the uploaded document for retrieval.",
    );
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
