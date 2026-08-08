import type { CalcInputValue, CalcResult } from "./types";

function lineForValue(item: CalcInputValue): string {
  const unit = item.unit ? ` ${item.unit}` : "";
  return `- ${item.label}: ${item.value}${unit}`;
}

/** Markdown summary suitable for chat attach / AI explain context. */
export function formatCalcResultMarkdown(result: CalcResult): string {
  const lines: string[] = [
    `## Electrical Calculator — ${result.title}`,
    "",
    `**Status:** ${result.ok ? "Complete" : "Incomplete / check failed"}`,
    "",
    "### Formula",
    result.formula,
    "",
    "### Inputs used",
  ];

  if (result.inputsUsed.length === 0) {
    lines.push("- (none)");
  } else {
    lines.push(...result.inputsUsed.map(lineForValue));
  }

  lines.push("", "### Result");
  if (result.results.length === 0) {
    lines.push("- No numerical result — required inputs are missing or checks failed.");
  } else {
    lines.push(...result.results.map(lineForValue));
  }

  lines.push("", "### Assumptions");
  if (result.assumptions.length === 0) {
    lines.push("- (none)");
  } else {
    lines.push(...result.assumptions.map((item) => `- ${item}`));
  }

  if (result.missingInputs.length > 0) {
    lines.push("", "### Missing inputs");
    lines.push(...result.missingInputs.map((item) => `- ${item}`));
  }

  if (result.notes?.length) {
    lines.push("", "### Notes");
    lines.push(...result.notes.map((item) => `- ${item}`));
  }

  lines.push(
    "",
    "_Deterministic calculator output. Not a standards requirement. Do not recalculate._",
  );

  return lines.join("\n");
}

export function buildExplainPrompt(result: CalcResult): string {
  return [
    "Explain the following Electrical Calculator result.",
    "Do not recalculate any numbers.",
    "Do not invent AS/NZS requirements, cable tables, diversity factors, or impedance values.",
    "Keep document-grounded information (if any) separate from this calculation result.",
    "If you add context beyond the calculator output, label it as General knowledge.",
    "",
    formatCalcResultMarkdown(result),
  ].join("\n");
}
