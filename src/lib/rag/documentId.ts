import path from "node:path";

/** Matches UUIDs, `pasted-text`, and other existing safe library slugs. */
const SAFE_DOCUMENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

export class UnsafeDocumentIdError extends Error {
  constructor(message = "Invalid document ID.") {
    super(message);
    this.name = "UnsafeDocumentIdError";
  }
}

export function getLibraryRootDir(): string {
  return path.join(process.cwd(), ".voltiq", "library");
}

/**
 * Validate a document ID and ensure its resolved directory stays inside LIBRARY_DIR.
 * Rejects traversal (`..`, `/`, `\`), absolute paths, and unsafe characters.
 */
export function assertSafeDocumentId(documentId: string): string {
  if (typeof documentId !== "string") {
    throw new UnsafeDocumentIdError("Document ID is required.");
  }

  const trimmed = documentId.trim();

  if (!trimmed) {
    throw new UnsafeDocumentIdError("Document ID is required.");
  }

  if (
    trimmed.includes("\0") ||
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    path.isAbsolute(trimmed) ||
    /^[a-zA-Z]:/.test(trimmed)
  ) {
    throw new UnsafeDocumentIdError("Invalid document ID.");
  }

  if (!SAFE_DOCUMENT_ID_PATTERN.test(trimmed)) {
    throw new UnsafeDocumentIdError("Invalid document ID.");
  }

  const libraryRoot = path.resolve(getLibraryRootDir());
  const resolved = path.resolve(libraryRoot, trimmed);
  const relative = path.relative(libraryRoot, resolved);

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new UnsafeDocumentIdError("Invalid document ID.");
  }

  return trimmed;
}

export function isSafeDocumentId(documentId: string): boolean {
  try {
    assertSafeDocumentId(documentId);
    return true;
  } catch {
    return false;
  }
}
