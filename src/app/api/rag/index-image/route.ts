import {
  clearIndexCancellation,
  isCancellationError,
  registerIndexCancellation,
} from "@/lib/rag/indexCancellation";
import { assertSafeDocumentId, UnsafeDocumentIdError } from "@/lib/rag/documentId";
import { ragLog } from "@/lib/rag/logger";
import { indexImageDocument } from "@/lib/rag/retrieve";
import type { IndexDocumentResult, IndexImageRequest } from "@/types/rag";

export const runtime = "nodejs";
export const maxDuration = 300;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: IndexImageRequest;

  try {
    body = (await request.json()) as IndexImageRequest;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!body.documentId?.trim() || !body.documentName?.trim()) {
    return errorResponse("Document ID and name are required.", 400);
  }

  try {
    body.documentId = assertSafeDocumentId(body.documentId);
  } catch (error) {
    if (error instanceof UnsafeDocumentIdError) {
      return errorResponse("Invalid document ID.", 400);
    }
    throw error;
  }

  if (!body.contentHash?.trim()) {
    return errorResponse("Content hash is required.", 400);
  }

  if (!body.mimeType?.trim()) {
    return errorResponse("Image MIME type is required.", 400);
  }

  ragLog(
    "upload",
    `Index-image API request for ${body.documentName} (${body.mimeType}).`,
  );

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.error("OpenAI API key not found.");
    return errorResponse("OpenAI API key is not configured.", 503);
  }

  const signal = registerIndexCancellation(body.documentId);

  try {
    const result: IndexDocumentResult = await indexImageDocument(body, signal);
    return Response.json(result);
  } catch (error) {
    if (isCancellationError(error)) {
      return Response.json({
        documentId: body.documentId,
        chunkCount: 0,
        skipped: false,
        status: "failed",
        error: "Document indexing cancelled.",
        cancelled: true,
      } satisfies IndexDocumentResult & { cancelled?: boolean });
    }

    console.error("Failed to index image:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyse and index the uploaded image.";

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
  } finally {
    clearIndexCancellation(body.documentId);
  }
}
