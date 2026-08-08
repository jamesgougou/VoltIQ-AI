import type { CalculatorId } from "./types";

const EXPLAIN_MARKERS = [
  "Explain the following Electrical Calculator result",
  "Do not recalculate any numbers",
  "Deterministic calculator output",
];

/** True when the message is an Explain-with-AI payload from the calculator panel. */
export function isCalculatorExplainPrompt(text: string): boolean {
  const trimmed = text.trim();
  return EXPLAIN_MARKERS.every((marker) => trimmed.includes(marker));
}

/**
 * Detects free-form chat that is asking the AI to perform an electrical calculation.
 * Document/standards Q&A should return false so normal RAG chat is preserved.
 */
export function isFreeFormCalculationRequest(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed || isCalculatorExplainPrompt(trimmed)) {
    return false;
  }

  // Keep document-grounded / standards questions on the RAG path.
  const isDocumentQuestion =
    /\b(in my documents?|uploaded documents?|from my (?:documents?|library|knowledge)|knowledge library|AS\/NZS|clause\s+\d|source\s*\/\s*page)\b/i.test(
      trimmed,
    );

  if (isDocumentQuestion && !/\b(calculate|computation|work out the)\b/i.test(trimmed)) {
    return false;
  }

  const hasVoltage = /\b\d+(?:\.\d+)?\s*(?:v|volts?)\b/i.test(trimmed);
  const hasCurrent = /\b\d+(?:\.\d+)?\s*(?:a|amps?|amperes?)\b/i.test(trimmed);
  const hasPhase =
    /\b(?:single[-\s]?phase|three[-\s]?phase|1[-\s]?ph(?:ase)?|3[-\s]?ph(?:ase)?)\b/i.test(
      trimmed,
    );
  const hasPowerFactor =
    /\b(?:pf|power\s*factor)\b/i.test(trimmed) &&
    /\b0?\.\d+|\b1(?:\.0+)?\b/.test(trimmed);
  const asksToCalculate =
    /\b(?:calculate|calculation|compute|work out|what(?:'s| is) the (?:power|current|voltage drop|k(?:w|va)|maximum demand)|voltage drop for|cable siz(?:e|ing) for)\b/i.test(
      trimmed,
    );
  const looksLikeBareElectricalInputs =
    hasVoltage &&
    hasCurrent &&
    (hasPhase || hasPowerFactor || /\+|and|,/.test(trimmed));

  if (looksLikeBareElectricalInputs) {
    return true;
  }

  if (asksToCalculate && (hasVoltage || hasCurrent || hasPowerFactor || hasPhase)) {
    return true;
  }

  if (
    /\bvoltage\s*drop\b/i.test(trimmed) &&
    (hasCurrent || /\b\d+(?:\.\d+)?\s*m(?:etres?|eters?)?\b/i.test(trimmed))
  ) {
    return true;
  }

  if (
    /\bmaximum\s*demand\b/i.test(trimmed) &&
    (/\bdiversity\b/i.test(trimmed) || /\b\d+(?:\.\d+)?\s*a\b/i.test(trimmed)) &&
    !isDocumentQuestion
  ) {
    return true;
  }

  return false;
}

export function suggestedCalculatorId(text: string): CalculatorId {
  if (/\bvoltage\s*drop\b|\b(?:Ω|ohm)\b/i.test(text)) {
    return "voltage-drop";
  }

  if (/\bmaximum\s*demand\b|\bdiversity\b/i.test(text)) {
    return "max-demand";
  }

  if (/\bcable\s*siz/i.test(text)) {
    return "cable-sizing";
  }

  return "power-current";
}

export const CALCULATOR_REDIRECT_MESSAGE = [
  "Electrical calculations are handled by the **Electrical Calculators** panel — not by AI chat.",
  "",
  "Please:",
  "1. Select a calculator type above",
  "2. Enter the structured inputs",
  "3. Run **Calculate** for a deterministic result",
  "4. Optionally use **Explain with AI** after the result is shown",
  "",
  "I will not perform numerical electrical calculations from free-form chat.",
].join("\n");
