import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { writeBytesAtomically } from "@/lib/rag/atomicWrite";
import {
  assertSafeDocumentId,
  getLibraryRootDir,
  isSafeDocumentId,
} from "@/lib/rag/documentId";
import { resolveLibrarySourceKind } from "@/lib/rag/libraryMeta";
import type { DocumentSourceKind, PdfPageText } from "@/lib/rag/types";

export { assertSafeDocumentId, UnsafeDocumentIdError } from "@/lib/rag/documentId";

export type LibraryDocumentArtifacts = {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  text: string;
  pages: PdfPageText[];
  hasPdf: boolean;
  hasImage: boolean;
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
};

/** Summary without full text/pages — used for list + hash lookup. */
export type LibraryDocumentLean = {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  hasPdf: boolean;
  hasImage: boolean;
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
};

type ExtractedPayload = {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  text: string;
  pages: PdfPageText[];
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
};

type LeanPayload = {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
};

const LIBRARY_DIR = getLibraryRootDir();

function documentDir(documentId: string): string {
  const safeId = assertSafeDocumentId(documentId);
  return path.join(LIBRARY_DIR, safeId);
}

function extractedPath(documentId: string): string {
  return path.join(documentDir(documentId), "extracted.json");
}

function leanMetaPath(documentId: string): string {
  return path.join(documentDir(documentId), "meta.json");
}

function pdfPath(documentId: string): string {
  return path.join(documentDir(documentId), "source.pdf");
}

function imagePath(documentId: string): string {
  return path.join(documentDir(documentId), "source.image");
}

function toLeanPayload(input: {
  documentId: string;
  filename: string;
  contentHash: string;
  fileSize: number;
  totalPages: number;
  indexedAt: string;
  sourceKind?: DocumentSourceKind;
  mimeType?: string;
  ocrText?: string;
  description?: string;
}): LeanPayload {
  return {
    documentId: input.documentId,
    filename: input.filename,
    contentHash: input.contentHash,
    fileSize: input.fileSize,
    totalPages: input.totalPages,
    indexedAt: input.indexedAt,
    sourceKind: input.sourceKind,
    mimeType: input.mimeType,
    ocrText: input.ocrText,
    description: input.description,
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function saveLibraryExtracted(
  input: Omit<LibraryDocumentArtifacts, "hasPdf" | "hasImage">,
): Promise<void> {
  const dir = documentDir(input.documentId);
  await mkdir(dir, { recursive: true });

  const payload: ExtractedPayload = {
    documentId: input.documentId,
    filename: input.filename,
    contentHash: input.contentHash,
    fileSize: input.fileSize,
    totalPages: input.totalPages,
    indexedAt: input.indexedAt,
    text: input.text,
    pages: input.pages,
    sourceKind: input.sourceKind,
    mimeType: input.mimeType,
    ocrText: input.ocrText,
    description: input.description,
  };

  // Compact JSON — preserve existing on-disk format.
  await writeBytesAtomically(
    extractedPath(input.documentId),
    JSON.stringify(payload),
    { encoding: "utf8", label: "extracted.json" },
  );

  // Lean summary for list/hash paths (no text/pages).
  await writeBytesAtomically(
    leanMetaPath(input.documentId),
    JSON.stringify(toLeanPayload(payload)),
    { encoding: "utf8", label: "meta.json" },
  );
}

export async function saveLibraryPdf(
  documentId: string,
  bytes: Buffer,
): Promise<void> {
  const dir = documentDir(documentId);
  await mkdir(dir, { recursive: true });
  await writeBytesAtomically(pdfPath(documentId), bytes, {
    label: "source.pdf",
  });
}

export async function saveLibraryImage(
  documentId: string,
  bytes: Buffer,
): Promise<void> {
  const dir = documentDir(documentId);
  await mkdir(dir, { recursive: true });
  await writeBytesAtomically(imagePath(documentId), bytes, {
    label: "source.image",
  });
}

export async function readLibraryExtracted(
  documentId: string,
): Promise<ExtractedPayload | null> {
  try {
    const raw = await readFile(extractedPath(documentId), "utf8");
    return JSON.parse(raw) as ExtractedPayload;
  } catch {
    return null;
  }
}

export async function readLibraryPdf(
  documentId: string,
): Promise<Buffer | null> {
  try {
    return await readFile(pdfPath(documentId));
  } catch {
    return null;
  }
}

export async function readLibraryImage(
  documentId: string,
): Promise<Buffer | null> {
  try {
    return await readFile(imagePath(documentId));
  } catch {
    return null;
  }
}

export async function libraryHasPdf(documentId: string): Promise<boolean> {
  return pathExists(pdfPath(documentId));
}

export async function libraryHasImage(documentId: string): Promise<boolean> {
  return pathExists(imagePath(documentId));
}

export async function listLibraryDocumentIds(): Promise<string[]> {
  try {
    await mkdir(LIBRARY_DIR, { recursive: true });
    const entries = await readdir(LIBRARY_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => isSafeDocumentId(name));
  } catch {
    return [];
  }
}

export async function getLibraryDocument(
  documentId: string,
): Promise<LibraryDocumentArtifacts | null> {
  const extracted = await readLibraryExtracted(documentId);
  if (!extracted) {
    return null;
  }

  const hasPdf = await libraryHasPdf(documentId);
  const hasImage = await libraryHasImage(documentId);

  return {
    ...extracted,
    hasPdf,
    hasImage,
    sourceKind: resolveLibrarySourceKind({
      hasPdf,
      hasImage,
      sourceKind: extracted.sourceKind,
      filename: extracted.filename,
      mimeType: extracted.mimeType,
    }),
  };
}

async function readLibraryLeanMeta(
  documentId: string,
): Promise<LeanPayload | null> {
  try {
    const raw = await readFile(leanMetaPath(documentId), "utf8");
    return JSON.parse(raw) as LeanPayload;
  } catch {
    return null;
  }
}

/**
 * Summary metadata without loading full extracted text/pages.
 * Falls back to extracted.json for libraries that predate meta.json.
 */
export async function getLibraryDocumentLean(
  documentId: string,
): Promise<LibraryDocumentLean | null> {
  const lean = await readLibraryLeanMeta(documentId);
  const hasPdf = await libraryHasPdf(documentId);
  const hasImage = await libraryHasImage(documentId);

  if (lean) {
    return {
      ...lean,
      hasPdf,
      hasImage,
      sourceKind: resolveLibrarySourceKind({
        hasPdf,
        hasImage,
        sourceKind: lean.sourceKind,
        filename: lean.filename,
        mimeType: lean.mimeType,
      }),
    };
  }

  const extracted = await readLibraryExtracted(documentId);
  if (!extracted) {
    return null;
  }

  return {
    documentId: extracted.documentId,
    filename: extracted.filename,
    contentHash: extracted.contentHash,
    fileSize: extracted.fileSize,
    totalPages: extracted.totalPages,
    indexedAt: extracted.indexedAt,
    hasPdf,
    hasImage,
    sourceKind: resolveLibrarySourceKind({
      hasPdf,
      hasImage,
      sourceKind: extracted.sourceKind,
      filename: extracted.filename,
      mimeType: extracted.mimeType,
    }),
    mimeType: extracted.mimeType,
    ocrText: extracted.ocrText,
    description: extracted.description,
  };
}

export async function findLibraryDocumentByHash(
  contentHash: string,
): Promise<LibraryDocumentLean | null> {
  const ids = await listLibraryDocumentIds();

  for (const documentId of ids) {
    const doc = await getLibraryDocumentLean(documentId);
    if (doc?.contentHash === contentHash) {
      return doc;
    }
  }

  return null;
}

export async function deleteLibraryDocument(documentId: string): Promise<void> {
  await rm(documentDir(documentId), { recursive: true, force: true });
}

export async function clearLibraryDocuments(): Promise<void> {
  await rm(LIBRARY_DIR, { recursive: true, force: true });
  await mkdir(LIBRARY_DIR, { recursive: true });
}
