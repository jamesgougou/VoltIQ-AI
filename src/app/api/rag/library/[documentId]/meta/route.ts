import { getVectorStore } from "@/lib/rag/store";
import {
  inferDocumentType,
  type LibraryTag,
  LIBRARY_TAG_OPTIONS,
} from "@/lib/rag/libraryMeta";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type MetaPatchBody = {
  enabled?: boolean;
  tags?: string[];
  documentType?: string;
  lastUsedAt?: string;
};

function sanitizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) {
    return undefined;
  }

  const allowed = new Set<string>(LIBRARY_TAG_OPTIONS);
  return [
    ...new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0 && (allowed.has(tag) || tag.length <= 32)),
    ),
  ];
}

export async function PATCH(request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId?.trim()) {
    return Response.json({ error: "Document ID is required." }, { status: 400 });
  }

  let body: MetaPatchBody;

  try {
    body = (await request.json()) as MetaPatchBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const store = getVectorStore();
    const existing = await store.getDocumentRecord(documentId);

    if (!existing) {
      return Response.json({ error: "Document not found." }, { status: 404 });
    }

    const tags = sanitizeTags(body.tags);
    const documentType =
      typeof body.documentType === "string" && body.documentType.trim()
        ? body.documentType.trim()
        : undefined;

    await store.updateDocumentRecordsMeta([
      {
        documentId,
        patch: {
          enabled:
            typeof body.enabled === "boolean" ? body.enabled : undefined,
          tags,
          documentType:
            documentType ??
            existing.documentType ??
            inferDocumentType(existing.filename),
          lastUsedAt:
            typeof body.lastUsedAt === "string" ? body.lastUsedAt : undefined,
        },
      },
    ]);

    const updated = await store.getDocumentRecord(documentId);

    return Response.json({
      documentId,
      enabled: updated?.enabled ?? true,
      tags: (updated?.tags ?? []) as LibraryTag[],
      documentType: updated?.documentType,
      lastUsedAt: updated?.lastUsedAt,
    });
  } catch (error) {
    console.error("Failed to update library metadata:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update document metadata.",
      },
      { status: 500 },
    );
  }
}
