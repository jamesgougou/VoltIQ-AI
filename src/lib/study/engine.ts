import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { buildRetrievedContextSection } from "@/lib/chat/buildPrompt";
import {
  retrieveWithHybridSearch,
  getDocumentIndexStatuses,
  resolveIndexingGateMessage,
  hasIndexedContent,
} from "@/lib/rag/retrieve";
import { toSourceMetadata } from "@/lib/rag/types";
import type { RetrievedSourceMetadata } from "@/lib/rag/types";
import {
  studyGenerateSystemPrompt,
  studyMarkSystemPrompt,
} from "@/lib/study/prompts";
import type {
  GenerateStudyRequest,
  GenerateStudyResponse,
  MarkResult,
  MarkStudyRequest,
  StudyFlashcard,
  StudyQuestion,
  StudyQuestionType,
  StudyVerdict,
} from "@/types/study";

function seedQuery(input: GenerateStudyRequest): string {
  const topics = input.focusTopics?.length
    ? input.focusTopics.join(", ")
    : "electrical standards switchboards testing solar protection";

  if (input.mode === "flashcards") {
    return `Key definitions terminology clauses for ${topics}`;
  }

  return `Study assessment questions about ${topics} for ${input.difficulty} electricians`;
}

function normalizeSources(
  sources: RetrievedSourceMetadata[],
): RetrievedSourceMetadata[] {
  return sources.slice(0, 5);
}

function parseJsonObject(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(raw) as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeQuestionType(value: unknown): StudyQuestionType {
  const raw = asString(value).toLowerCase();
  if (raw === "mcq" || raw === "multiple choice" || raw === "multiple-choice") {
    return "mcq";
  }
  if (raw === "true-false" || raw === "true/false" || raw === "boolean") {
    return "true-false";
  }
  if (raw === "scenario" || raw === "scenario-based") {
    return "scenario";
  }
  return "short";
}

function normalizeVerdict(value: unknown): StudyVerdict {
  const raw = asString(value).toLowerCase();
  if (raw === "correct") return "correct";
  if (raw === "partial" || raw === "partially correct") return "partial";
  return "incorrect";
}

function normalizeScore(value: unknown, verdict: StudyVerdict): 0 | 0.5 | 1 {
  if (value === 1 || value === "1") return 1;
  if (value === 0.5 || value === "0.5") return 0.5;
  if (value === 0 || value === "0") return 0;
  if (verdict === "correct") return 1;
  if (verdict === "partial") return 0.5;
  return 0;
}

async function assertStudyReady(documentIds: string[]): Promise<void> {
  if (!(await hasIndexedContent())) {
    throw new Error(
      "No indexed documents are available for Study Mode. Upload and index documents first.",
    );
  }

  if (documentIds.length > 0) {
    const statuses = await getDocumentIndexStatuses(documentIds);
    const gate = resolveIndexingGateMessage(documentIds, statuses);
    if (gate) {
      throw new Error(gate);
    }
  }
}

export async function generateStudyContent(
  request: GenerateStudyRequest,
): Promise<GenerateStudyResponse> {
  await assertStudyReady(request.documentIds);

  const retrieval = await retrieveWithHybridSearch(
    seedQuery(request),
    10,
    request.documentIds,
  );

  if (retrieval.insufficientRetrieval || retrieval.chunks.length === 0) {
    throw new Error(
      "I couldn't find sufficient information in the uploaded documents to generate study material.",
    );
  }

  const sources = normalizeSources(toSourceMetadata(retrieval.chunks));
  const context = buildRetrievedContextSection(retrieval.chunks);
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: studyGenerateSystemPrompt(request),
      },
      {
        role: "user",
        content: `${context}\n\nGenerate ${request.count} ${request.mode} item(s) now.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("Study generation returned an empty response.");
  }

  const parsed = parseJsonObject(content);

  if (request.mode === "flashcards") {
    const rows = Array.isArray(parsed.flashcards) ? parsed.flashcards : [];
    const flashcards: StudyFlashcard[] = rows
      .map((row, index) => {
        const item = row as Record<string, unknown>;
        return {
          id: asString(item.id, `card-${index + 1}`),
          front: asString(item.front),
          back: asString(item.back),
          topic: asString(item.topic, "General"),
          sources,
        };
      })
      .filter((card) => card.front && card.back)
      .slice(0, request.count);

    if (flashcards.length === 0) {
      throw new Error("No flashcards could be generated from the documents.");
    }

    return { flashcards };
  }

  const rows = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions: StudyQuestion[] = rows
    .map((row, index) => {
      const item = row as Record<string, unknown>;
      const type = normalizeQuestionType(item.type);
      const options = Array.isArray(item.options)
        ? item.options.map((option) => asString(option)).filter(Boolean)
        : undefined;

      return {
        id: asString(item.id, `q-${index + 1}`),
        type,
        prompt: asString(item.prompt),
        options: type === "mcq" || type === "true-false" ? options : options,
        correctAnswer: asString(item.correctAnswer),
        topic: asString(item.topic, "General"),
        difficulty: request.difficulty,
        sources,
      };
    })
    .filter((question) => question.prompt && question.correctAnswer)
    .slice(0, request.count);

  if (questions.length === 0) {
    throw new Error("No study questions could be generated from the documents.");
  }

  return { questions };
}

export async function markStudyAnswer(
  request: MarkStudyRequest,
): Promise<MarkResult> {
  await assertStudyReady(request.documentIds);

  const query = `${request.question.prompt}\n${request.userAnswer}\n${request.question.correctAnswer}`;
  const retrieval = await retrieveWithHybridSearch(
    query,
    8,
    request.documentIds,
  );
  const sources = normalizeSources([
    ...request.question.sources,
    ...toSourceMetadata(retrieval.chunks),
  ]);
  const context = buildRetrievedContextSection(retrieval.chunks);
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: studyMarkSystemPrompt() },
      {
        role: "user",
        content: [
          context,
          "",
          `Question type: ${request.question.type}`,
          `Topic: ${request.question.topic}`,
          `Question: ${request.question.prompt}`,
          request.question.options?.length
            ? `Options: ${request.question.options.join(" | ")}`
            : "",
          `Expected answer: ${request.question.correctAnswer}`,
          `Learner answer: ${request.userAnswer}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("Marking returned an empty response.");
  }

  const parsed = parseJsonObject(content);
  const verdict = normalizeVerdict(parsed.verdict);
  const score = normalizeScore(parsed.score, verdict);

  return {
    verdict,
    score,
    feedback: asString(parsed.feedback, "Answer reviewed."),
    whyIncorrect: asString(parsed.whyIncorrect) || undefined,
    correctAnswer:
      asString(parsed.correctAnswer) || request.question.correctAnswer,
    explanation: asString(
      parsed.explanation,
      "Review the referenced document content for the correct requirement.",
    ),
    sources,
  };
}
