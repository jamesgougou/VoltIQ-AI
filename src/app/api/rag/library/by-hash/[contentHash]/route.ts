import { findLibraryDocumentByHash } from "@/lib/rag/libraryStore";
import { getDocumentIndexStatuses } from "@/lib/rag/retrieve";
import { getVectorStore } from "@/lib/rag/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ contentHash: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { contentHash } = await context.params;

  if (!contentHash?.trim()) {
    return Response.json({ error: "Content hash is required." }, { status: 400 });
  }

  try {
    const vectorMatch =
      await getVectorStore().findDocumentByContentHash(contentHash);

    // Prefer vector meta — skip full library FS scan when already identified.
    const libraryMatch = vectorMatch
      ? null
      : await findLibraryDocumentByHash(contentHash);

    const documentId =
      vectorMatch?.documentId ?? libraryMatch?.documentId ?? null;

    if (!documentId) {
      return Response.json({ found: false });
    }

    const [status] = await getDocumentIndexStatuses([documentId]);

    return Response.json({
      found: true,
      documentId,
      filename: vectorMatch?.filename ?? libraryMatch?.filename,
      contentHash,
      fileSize: vectorMatch?.fileSize ?? libraryMatch?.fileSize ?? 0,
      totalPages: vectorMatch?.totalPages ?? libraryMatch?.totalPages ?? 0,
      indexedAt: vectorMatch?.indexedAt ?? libraryMatch?.indexedAt ?? "",
      hasPdf: vectorMatch?.hasPdf ?? libraryMatch?.hasPdf ?? false,
      status: status?.status ?? "ready",
      chunkCount: status?.chunkCount ?? vectorMatch?.chunkIds.length ?? 0,
    });
  } catch (error) {
    console.error("Failed to lookup document by hash:", error);
    return Response.json(
      { error: "Unable to lookup document by hash." },
      { status: 500 },
    );
  }
}
