import { describe, expect, it } from "vitest";
import {
  isCalculatorExplainPrompt,
  isFreeFormCalculationRequest,
  suggestedCalculatorId,
} from "./detectCalcRequest";
import { buildExplainPrompt } from "./formatResult";
import { calculatePowerCurrent } from "./powerCurrent";

describe("isFreeFormCalculationRequest", () => {
  it("intercepts bare single-phase power inputs", () => {
    expect(
      isFreeFormCalculationRequest("240 V + 20 A + Single phase"),
    ).toBe(true);
    expect(suggestedCalculatorId("240 V + 20 A + Single phase")).toBe(
      "power-current",
    );
  });

  it("intercepts three-phase power inputs with PF", () => {
    expect(
      isFreeFormCalculationRequest("400 V + 25 A + PF 0.9 + Three phase"),
    ).toBe(true);
  });

  it("intercepts explicit calculate requests", () => {
    expect(
      isFreeFormCalculationRequest(
        "Calculate the voltage drop for a 20 m cable carrying 25 A",
      ),
    ).toBe(true);
    expect(
      suggestedCalculatorId(
        "Calculate the voltage drop for a 20 m cable carrying 25 A",
      ),
    ).toBe("voltage-drop");
  });

  it("allows document/standards questions through to RAG", () => {
    expect(
      isFreeFormCalculationRequest(
        "Maximum Demand method in my documents — include Source / Page",
      ),
    ).toBe(false);
    expect(
      isFreeFormCalculationRequest(
        "What does AS/NZS 3000 Clause 2.5 require?",
      ),
    ).toBe(false);
  });

  it("allows Explain with AI calculator prompts through", () => {
    const result = calculatePowerCurrent({
      mode: "power-from-vi",
      phaseSystem: "single-phase",
      voltageV: 240,
      currentA: 20,
    });
    const prompt = buildExplainPrompt(result);
    expect(isCalculatorExplainPrompt(prompt)).toBe(true);
    expect(isFreeFormCalculationRequest(prompt)).toBe(false);
  });
});
