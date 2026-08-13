import { getEmbeddingModel } from "@/lib/rag/embed";

/** Bumped when the on-disk knowledge library schema/capabilities change. */
export const KNOWLEDGE_BASE_VERSION = "4.8";

export const LIBRARY_TAG_OPTIONS = [
  "Electrical",
  "Solar",
  "Inspection",
  "Testing",
  "Switchboards",
  "Safety",
  "Standards",
  "Manufacturer",
] as const;

export type LibraryTag = (typeof LIBRARY_TAG_OPTIONS)[number];

export type LibrarySortKey =
  | "recently-indexed"
  | "recently-used"
  | "alphabetical"
  | "file-size"
  | "document-type";

export type RetrievalScopeMode =
  | "all-enabled"
  | "current"
  | "selected";

export type RetrievalScope = {
  mode: RetrievalScopeMode;
  /** Used when mode is "current". */
  currentDocumentId?: string | null;
  /** Used when mode is "selected". */
  selectedDocumentIds?: string[];
};

const IMAGE_FILENAME_RE = /\.(png|jpe?g|webp|gif|bmp|heic)$/i;

export function isImageFilename(filename: string): boolean {
  return IMAGE_FILENAME_RE.test(filename);
}

/**
 * Resolve whether a library item belongs in Knowledge Library (pdf) or Images.
 * Filesystem flags win over stale metadata so persisted items migrate correctly.
 */
export function resolveLibrarySourceKind(input: {
  hasPdf?: boolean;
  hasImage?: boolean;
  sourceKind?: "pdf" | "image" | "text" | string | null;
  filename?: string;
  documentType?: string;
  mimeType?: string;
}): "pdf" | "image" | "text" {
  const hasPdf = Boolean(input.hasPdf);
  const hasImage = Boolean(input.hasImage);

  if (hasImage && !hasPdf) {
    return "image";
  }

  if (hasPdf && !hasImage) {
    return "pdf";
  }

  if (hasPdf && hasImage) {
    // Prefer explicit kind; default to PDF so Knowledge Library keeps standards.
    if (input.sourceKind === "image") {
      return "image";
    }
    return "pdf";
  }

  if (input.sourceKind === "image" || input.sourceKind === "pdf" || input.sourceKind === "text") {
    return input.sourceKind;
  }

  const mime = (input.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) {
    return "image";
  }

  if (
    input.documentType === "Image" ||
    (input.filename ? isImageFilename(input.filename) : false)
  ) {
    return "image";
  }

  if (
    input.documentType === "PDF" ||
    (input.filename ? input.filename.toLowerCase().endsWith(".pdf") : false)
  ) {
    return "pdf";
  }

  return "text";
}

export function inferDocumentType(filename: string): string {
  const name = filename.toLowerCase();

  if (isImageFilename(name)) {
    return "Image";
  }

  if (/\bas\s*\d+/i.test(filename) || name.includes("as/nzs")) {
    return "Standard";
  }

  if (name.includes("cec") || name.includes("guide")) {
    return "Guide";
  }

  if (name.includes("sop") || name.includes("procedure")) {
    return "SOP";
  }

  if (
    name.includes("manual") ||
    name.includes("datasheet") ||
    name.includes("installer")
  ) {
    return "Manual";
  }

  if (name.endsWith(".pdf")) {
    return "PDF";
  }

  return "Document";
}

export function currentEmbeddingModel(): string {
  return getEmbeddingModel();
}

export function documentNeedsReindex(embeddingModel?: string): boolean {
  if (!embeddingModel) {
    return false;
  }

  return embeddingModel !== currentEmbeddingModel();
}

export function resolveRetrievalDocumentIds(
  documents: Array<{ id: string; enabled?: boolean }>,
  scope: RetrievalScope,
): string[] {
  const enabled = documents.filter((document) => document.enabled !== false);

  if (scope.mode === "current") {
    const currentId = scope.currentDocumentId;
    if (!currentId) {
      return [];
    }

    return enabled.some((document) => document.id === currentId)
      ? [currentId]
      : [];
  }

  if (scope.mode === "selected") {
    const selected = new Set(scope.selectedDocumentIds ?? []);
    return enabled
      .filter((document) => selected.has(document.id))
      .map((document) => document.id);
  }

  return enabled.map((document) => document.id);
}

/**
 * Enabled managed document IDs for retrieval-scope sync (PDFs, images, pasted text).
 */
export function collectEnabledManagedIds(input: {
  pdfs: Array<{ id: string; enabled?: boolean }>;
  images: Array<{ id: string; enabled?: boolean }>;
  includePastedText?: boolean;
  pastedTextId?: string;
}): string[] {
  const ids = [
    ...input.pdfs
      .filter((pdf) => pdf.enabled !== false)
      .map((pdf) => pdf.id),
    ...input.images
      .filter((image) => image.enabled !== false)
      .map((image) => image.id),
  ];

  if (input.includePastedText && input.pastedTextId) {
    ids.push(input.pastedTextId);
  }

  return ids;
}

/**
 * Keep current/selected scope IDs that remain enabled; never PDF-only.
 */
export function pruneRetrievalScope(
  scope: RetrievalScope,
  enabledIds: string[],
): RetrievalScope {
  const enabledSet = new Set(enabledIds);
  const nextCurrent =
    scope.currentDocumentId && enabledSet.has(scope.currentDocumentId)
      ? scope.currentDocumentId
      : (enabledIds[0] ?? null);

  const nextSelected = (scope.selectedDocumentIds ?? []).filter((id) =>
    enabledSet.has(id),
  );

  if (
    nextCurrent === scope.currentDocumentId &&
    nextSelected.length === (scope.selectedDocumentIds ?? []).length
  ) {
    return scope;
  }

  return {
    ...scope,
    currentDocumentId: nextCurrent,
    selectedDocumentIds: nextSelected.length > 0 ? nextSelected : enabledIds,
  };
}

export function formatRetrievalScopeLabel(
  documents: Array<{ id: string; name: string; enabled?: boolean }>,
  scope: RetrievalScope,
): string {
  const ids = resolveRetrievalDocumentIds(documents, scope);
  const names = ids
    .map(
      (id) =>
        documents.find((document) => document.id === id)?.name ?? id,
    )
    .map((name) => name.replace(/\.[^.]+$/, ""));

  if (scope.mode === "all-enabled") {
    return names.length === 0
      ? "No enabled documents"
      : "All Enabled Documents";
  }

  if (names.length === 0) {
    return "No documents selected";
  }

  if (names.length <= 3) {
    return names.join(" + ");
  }

  return `${names.slice(0, 2).join(" + ")} + ${names.length - 2} more`;
}

export type LibrarySearchableDocument = {
  id: string;
  fileName: string;
  tags?: string[];
  documentType?: string;
  fileSize?: number;
  indexedAt?: string;
  lastUsedAt?: string;
};

/** Instant library filter by filename, tags, type, or standard number. */
export function matchesLibraryQuery(
  document: LibrarySearchableDocument,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const haystack = [
    document.fileName,
    document.documentType ?? "",
    ...(document.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(trimmed)) {
    return true;
  }

  // Compact standard numbers: "AS3000" matches "AS3000-2018.pdf"
  const compactQuery = trimmed.replace(/[\s/_-]+/g, "");
  const compactName = document.fileName.toLowerCase().replace(/[\s/_-]+/g, "");
  return compactName.includes(compactQuery);
}

export function sortLibraryDocuments<T extends LibrarySearchableDocument>(
  documents: T[],
  sortKey: LibrarySortKey,
): T[] {
  const sorted = [...documents];

  sorted.sort((left, right) => {
    switch (sortKey) {
      case "recently-used": {
        const leftUsed = left.lastUsedAt ? Date.parse(left.lastUsedAt) : 0;
        const rightUsed = right.lastUsedAt ? Date.parse(right.lastUsedAt) : 0;
        if (rightUsed !== leftUsed) {
          return rightUsed - leftUsed;
        }
        break;
      }
      case "file-size":
        return (right.fileSize ?? 0) - (left.fileSize ?? 0);
      case "document-type": {
        const typeCompare = (left.documentType ?? "").localeCompare(
          right.documentType ?? "",
        );
        if (typeCompare !== 0) {
          return typeCompare;
        }
        break;
      }
      case "alphabetical":
        return left.fileName.localeCompare(right.fileName, undefined, {
          sensitivity: "base",
        });
      case "recently-indexed":
      default: {
        const leftIndexed = left.indexedAt ? Date.parse(left.indexedAt) : 0;
        const rightIndexed = right.indexedAt ? Date.parse(right.indexedAt) : 0;
        if (rightIndexed !== leftIndexed) {
          return rightIndexed - leftIndexed;
        }
        break;
      }
    }

    return left.fileName.localeCompare(right.fileName, undefined, {
      sensitivity: "base",
    });
  });

  return sorted;
}

export const LIBRARY_SORT_STORAGE_KEY = "voltiq.library.sort";

export function loadLibrarySortPreference(): LibrarySortKey {
  if (typeof window === "undefined") {
    return "recently-indexed";
  }

  try {
    const stored = window.localStorage.getItem(LIBRARY_SORT_STORAGE_KEY);
    const allowed: LibrarySortKey[] = [
      "recently-indexed",
      "recently-used",
      "alphabetical",
      "file-size",
      "document-type",
    ];
    if (stored && allowed.includes(stored as LibrarySortKey)) {
      return stored as LibrarySortKey;
    }
  } catch {
    // Ignore storage failures.
  }

  return "recently-indexed";
}

export function saveLibrarySortPreference(sortKey: LibrarySortKey): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LIBRARY_SORT_STORAGE_KEY, sortKey);
  } catch {
    // Ignore storage failures.
  }
}
