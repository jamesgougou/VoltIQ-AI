import { markObjectiveAnswer } from "@/lib/study/deterministicMark";
import type {
  GenerateStudyRequest,
  GenerateStudyResponse,
  MarkResult,
  MarkStudyRequest,
} from "@/types/study";

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return payload?.error || "Study request failed.";
}

export async function generateStudyMaterial(
  request: GenerateStudyRequest,
): Promise<GenerateStudyResponse> {
  const response = await fetch("/api/study/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as GenerateStudyResponse;
}

export async function markStudyMaterial(
  request: MarkStudyRequest,
): Promise<MarkResult> {
  const deterministic = markObjectiveAnswer(
    request.question,
    request.userAnswer,
  );
  if (deterministic) {
    return deterministic;
  }

  const response = await fetch("/api/study/mark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as MarkResult;
}
