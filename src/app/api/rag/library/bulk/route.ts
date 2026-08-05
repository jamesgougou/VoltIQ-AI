import { deleteIndexedDocument } from "@/lib/rag/retrieve";
import { getVectorStore } from "@/lib/rag/store";

export const runtime = "nodejs";

type BulkBody = {
  action: "enable" | "disable" | "delete";
  documentIds: string[];
};

export async function POST(request: Request) {
  let body: BulkBody;

  try {
    body = (await request.json()) as BulkBody;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body?.action || !Array.isArray(body.documentIds)) {
    return Response.json(
      { error: "action and documentIds are required." },
      { status: 400 },
    );
  }

  const documentIds = body.documentIds.filter(
    (id) => typeof id === "string" && id.trim().length > 0,
  );

  if (documentIds.length === 0) {
    return Response.json({ error: "No documents selected." }, { status: 400 });
  }

  try {
    if (body.action === "delete") {
      for (const documentId of documentIds) {
        await deleteIndexedDocument(documentId);
      }

      return Response.json({ success: true, deleted: documentIds.length });
    }

    if (body.action === "enable" || body.action === "disable") {
      const enabled = body.action === "enable";
      await getVectorStore().updateDocumentRecordsMeta(
        documentIds.map((documentId) => ({
          documentId,
          patch: { enabled },
        })),
      );

      return Response.json({
        success: true,
        updated: documentIds.length,
        enabled,
      });
    }

    return Response.json({ error: "Unsupported bulk action." }, { status: 400 });
  } catch (error) {
    console.error("Bulk library action failed:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to complete the bulk library action.",
      },
      { status: 500 },
    );
  }
}
