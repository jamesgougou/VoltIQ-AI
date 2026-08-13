import {
  assertSafeDocumentId,
  UnsafeDocumentIdError,
} from "@/lib/rag/documentId";
import { deleteIndexedDocument } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: { documentId?: string };

  try {
    body = (await request.json()) as { documentId?: string };
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!body.documentId?.trim()) {
    return errorResponse("Document ID is required.", 400);
  }

  let documentId: string;

  try {
    documentId = assertSafeDocumentId(body.documentId);
  } catch (error) {
    if (error instanceof UnsafeDocumentIdError) {
      return errorResponse("Invalid document ID.", 400);
    }
    throw error;
  }

  try {
    await deleteIndexedDocument(documentId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document index:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to remove the document from the index.",
      500,
    );
  }
}
