import {
  assertSafeDocumentId,
  UnsafeDocumentIdError,
} from "@/lib/rag/documentId";

/** Parse a route/document ID param; returns a 400 Response when unsafe. */
export function resolveRouteDocumentId(
  documentId: string | undefined,
): string | Response {
  if (!documentId?.trim()) {
    return Response.json({ error: "Document ID is required." }, { status: 400 });
  }

  try {
    return assertSafeDocumentId(documentId);
  } catch (error) {
    if (error instanceof UnsafeDocumentIdError) {
      return Response.json({ error: "Invalid document ID." }, { status: 400 });
    }
    throw error;
  }
}
