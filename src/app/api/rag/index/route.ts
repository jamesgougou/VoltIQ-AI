import {
  deleteIndexedDocument,
  indexDocument,
} from "@/lib/rag/retrieve";
import { ragLog } from "@/lib/rag/logger";
import type { IndexDocumentRequest, IndexDocumentResult } from "@/types/rag";

export const runtime = "nodejs";
export const maxDuration = 300;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: IndexDocumentRequest;

  try {
    body = (await request.json()) as IndexDocumentRequest;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!body.documentId?.trim() || !body.documentName?.trim()) {
    return errorResponse("Document ID and name are required.", 400);
  }

  if (!body.contentHash?.trim()) {
    return errorResponse("Content hash is required.", 400);
  }

  if (typeof body.text !== "string") {
    return errorResponse("Document text is required.", 400);
  }

  const pageCount = body.pages?.length ?? 0;
  const textLength = body.text.length;

  ragLog(
    "upload",
    `Index API request received for ${body.documentName}: pages=${pageCount}, textLength=${textLength}.`,
  );

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.error("OpenAI API key not found.");
    return errorResponse("OpenAI API key is not configured.", 503);
  }

  try {
    const result: IndexDocumentResult = await indexDocument(body);
    return Response.json(result);
  } catch (error) {
    console.error("Failed to index document:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to index the uploaded document.";

    return Response.json(
      {
        documentId: body.documentId,
        chunkCount: 0,
        skipped: false,
        status: "failed",
        error: message,
      } satisfies IndexDocumentResult,
      { status: 500 },
    );
  }
}
