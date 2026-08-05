import { generateStudyContent } from "@/lib/study/engine";
import type { GenerateStudyRequest } from "@/types/study";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: GenerateStudyRequest;

  try {
    body = (await request.json()) as GenerateStudyRequest;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!body?.mode || !body.difficulty || !body.count) {
    return errorResponse("mode, difficulty, and count are required.", 400);
  }

  if (!Array.isArray(body.documentIds) || body.documentIds.length === 0) {
    return errorResponse(
      "At least one enabled document must be selected for Study Mode.",
      400,
    );
  }

  const count = Math.min(Math.max(Number(body.count) || 1, 1), 50);

  try {
    const result = await generateStudyContent({
      ...body,
      count,
      documentIds: body.documentIds.filter(
        (id) => typeof id === "string" && id.trim().length > 0,
      ),
    });
    return Response.json(result);
  } catch (error) {
    console.error("Study generate failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Unable to generate study material.";
    const status = message.toLowerCase().includes("sufficient") ? 422 : 500;
    return errorResponse(message, status);
  }
}
