import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { DocumentSourceKind, PdfPageText } from "@/lib/rag/types";

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

const STORE_DIR = path.join(process.cwd(), ".voltiq");
const LIBRARY_DIR = path.join(STORE_DIR, "library");

function documentDir(documentId: string): string {
  return path.join(LIBRARY_DIR, documentId);
}

function extractedPath(documentId: string): string {
  return path.join(documentDir(documentId), "extracted.json");
}

function pdfPath(documentId: string): string {
  return path.join(documentDir(documentId), "source.pdf");
}

function imagePath(documentId: string): string {
  return path.join(documentDir(documentId), "source.image");
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

  await writeFile(
    extractedPath(input.documentId),
    JSON.stringify(payload),
    "utf8",
  );
}

export async function saveLibraryPdf(
  documentId: string,
  bytes: Buffer,
): Promise<void> {
  const dir = documentDir(documentId);
  await mkdir(dir, { recursive: true });
  await writeFile(pdfPath(documentId), bytes);
}

export async function saveLibraryImage(
  documentId: string,
  bytes: Buffer,
): Promise<void> {
  const dir = documentDir(documentId);
  await mkdir(dir, { recursive: true });
  await writeFile(imagePath(documentId), bytes);
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
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
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
    sourceKind:
      extracted.sourceKind ??
      (hasImage ? "image" : hasPdf ? "pdf" : "text"),
  };
}

export async function findLibraryDocumentByHash(
  contentHash: string,
): Promise<LibraryDocumentArtifacts | null> {
  const ids = await listLibraryDocumentIds();

  for (const documentId of ids) {
    const doc = await getLibraryDocument(documentId);
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
