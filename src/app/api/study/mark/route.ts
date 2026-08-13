import { markObjectiveAnswer } from "@/lib/study/deterministicMark";
import { markStudyAnswer } from "@/lib/study/engine";
import type { MarkStudyRequest } from "@/types/study";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: MarkStudyRequest;

  try {
    body = (await request.json()) as MarkStudyRequest;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  if (!body?.question?.prompt || typeof body.userAnswer !== "string") {
    return errorResponse("question and userAnswer are required.", 400);
  }

  try {
    const deterministic = markObjectiveAnswer(
      body.question,
      body.userAnswer,
    );
    if (deterministic) {
      return Response.json(deterministic);
    }

    const result = await markStudyAnswer({
      question: body.question,
      userAnswer: body.userAnswer,
      documentIds: (body.documentIds ?? []).filter(
        (id) => typeof id === "string" && id.trim().length > 0,
      ),
    });
    return Response.json(result);
  } catch (error) {
    console.error("Study mark failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unable to mark this answer.",
      500,
    );
  }
}
