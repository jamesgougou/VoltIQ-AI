import { getLibraryDocument } from "@/lib/rag/libraryStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId?.trim()) {
    return Response.json({ error: "Document ID is required." }, { status: 400 });
  }

  try {
    const document = await getLibraryDocument(documentId);

    if (!document) {
      return Response.json({ error: "Document not found." }, { status: 404 });
    }

    return Response.json({
      documentId: document.documentId,
      filename: document.filename,
      contentHash: document.contentHash,
      fileSize: document.fileSize,
      totalPages: document.totalPages,
      indexedAt: document.indexedAt,
      hasPdf: document.hasPdf,
      hasImage: document.hasImage,
      sourceKind: document.sourceKind,
      mimeType: document.mimeType,
      ocrText: document.ocrText,
      description: document.description,
      text: document.text,
      pages: document.pages,
    });
  } catch (error) {
    console.error("Failed to load library document:", error);
    return Response.json(
      { error: "Unable to load the document." },
      { status: 500 },
    );
  }
}
