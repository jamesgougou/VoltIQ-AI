import { cancelIndexedDocument } from "@/lib/rag/retrieve";

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

  try {
    await cancelIndexedDocument(body.documentId.trim());
    return Response.json({
      success: true,
      message: "Document indexing cancelled.",
    });
  } catch (error) {
    console.error("Failed to cancel document indexing:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to cancel document indexing.",
      500,
    );
  }
}
