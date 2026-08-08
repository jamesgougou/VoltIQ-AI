export { calculateCableSizing } from "./cableSizing";
export {
  CALCULATOR_REDIRECT_MESSAGE,
  isCalculatorExplainPrompt,
  isFreeFormCalculationRequest,
  suggestedCalculatorId,
} from "./detectCalcRequest";
export { formatCalcResultMarkdown, buildExplainPrompt } from "./formatResult";
export { calculateMaxDemand } from "./maxDemand";
export { calculatePowerCurrent } from "./powerCurrent";
export { calculateVoltageDrop } from "./voltageDrop";
export type {
  CableSizingInput,
  CalcInputValue,
  CalcPhaseSystem,
  CalcResult,
  CalculatorId,
  MaxDemandInput,
  MaxDemandLoad,
  PowerCurrentInput,
  PowerCurrentMode,
  VoltageDropInput,
} from "./types";

export const CALCULATOR_TOOLS = [
  {
    id: "power-current" as const,
    title: "Power / Current",
    description: "P = V × I, single/three-phase current, kW / kVA",
  },
  {
    id: "voltage-drop" as const,
    title: "Voltage Drop",
    description: "Vd from user-supplied R or Z — no invented cable data",
  },
  {
    id: "cable-sizing" as const,
    title: "Cable Sizing",
    description: "Framework checks using your CCC and derating inputs",
  },
  {
    id: "max-demand" as const,
    title: "Maximum Demand",
    description: "Sum loads with explicit diversity factors only",
  },
];
