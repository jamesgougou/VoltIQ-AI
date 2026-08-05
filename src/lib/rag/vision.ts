import { getOpenAIClient, getOpenAIVisionModel } from "@/lib/openai";

export type ImageVisionAnalysis = {
  ocrText: string;
  description: string;
  /** Combined text used for chunking / embeddings. */
  indexText: string;
  model: string;
};

const VISION_SYSTEM_PROMPT = `You are VoltIQ Vision, an electrical document and image analyst.

Analyse the uploaded electrical image carefully.

Extract:
1. OCR_TEXT — all readable text (nameplates, labels, schedules, stickers, handwritten notes if readable). Preserve line breaks. If no readable text, write exactly: (no readable text)
2. DESCRIPTION — a concise technical description of what the image shows (switchboard, inverter, SLD, wiring diagram, warning label, PV layout, battery, meter panel, etc.). Note key devices, ratings, and layout when visible.

Rules:
- Never invent text that is not visible.
- Never invent ratings, model numbers, or clause references that cannot be read.
- If the image is unclear or unreadable, say so plainly in DESCRIPTION and use (no readable text) for OCR_TEXT when appropriate.
- Respond in exactly this format:

OCR_TEXT:
<text>

DESCRIPTION:
<text>`;

function parseVisionResponse(content: string): {
  ocrText: string;
  description: string;
} {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const ocrMatch = normalized.match(
    /OCR_TEXT:\s*([\s\S]*?)(?=\n\s*DESCRIPTION:|$)/i,
  );
  const descriptionMatch = normalized.match(/DESCRIPTION:\s*([\s\S]*)$/i);

  const ocrText = (ocrMatch?.[1] ?? "").trim();
  const description = (descriptionMatch?.[1] ?? normalized).trim();

  return {
    ocrText:
      ocrText && ocrText.toLowerCase() !== "(no readable text)"
        ? ocrText
        : ocrText || "(no readable text)",
    description: description || "Unable to determine image contents confidently.",
  };
}

export function buildImageIndexText(input: {
  filename: string;
  ocrText: string;
  description: string;
}): string {
  const ocr =
    input.ocrText.trim() &&
    input.ocrText.trim().toLowerCase() !== "(no readable text)"
      ? input.ocrText.trim()
      : "";
  const description = input.description.trim();

  const parts = [
    `[Image: ${input.filename}]`,
    description ? `Description:\n${description}` : "",
    ocr ? `OCR Text:\n${ocr}` : "",
  ].filter(Boolean);

  return parts.join("\n\n");
}

/**
 * Analyse an electrical image with the configured OpenAI vision-capable model.
 * Reuses the shared OpenAI client (no separate pipeline).
 */
export async function analyzeElectricalImage(input: {
  bytes: Buffer;
  mimeType: string;
  filename: string;
  signal?: AbortSignal;
}): Promise<ImageVisionAnalysis> {
  const model = getOpenAIVisionModel();
  const client = getOpenAIClient();
  const dataUrl = `data:${input.mimeType};base64,${input.bytes.toString("base64")}`;

  const completion = await client.chat.completions.create(
    {
      model,
      temperature: 0,
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse this electrical image (${input.filename}). Extract OCR text and provide a concise technical description.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    },
    { signal: input.signal },
  );

  const content = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("Vision model returned an empty analysis.");
  }

  const parsed = parseVisionResponse(content);
  const indexText = buildImageIndexText({
    filename: input.filename,
    ocrText: parsed.ocrText,
    description: parsed.description,
  });

  if (!indexText.trim()) {
    throw new Error("Unable to extract usable content from this image.");
  }

  return {
    ocrText: parsed.ocrText,
    description: parsed.description,
    indexText,
    model,
  };
}
