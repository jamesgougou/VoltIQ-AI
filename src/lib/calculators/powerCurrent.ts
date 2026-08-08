import { formatNumber, isPositiveFinite } from "./helpers";
import type { CalcInputValue, CalcResult, PowerCurrentInput } from "./types";

const SQRT_3 = Math.sqrt(3);

export function calculatePowerCurrent(input: PowerCurrentInput): CalcResult {
  const title = "Power / Current";
  const missingInputs: string[] = [];
  const assumptions: string[] = [];
  const notes: string[] = [
    "This is a deterministic calculation result, not an AS/NZS requirement.",
  ];

  if (!input.mode) {
    missingInputs.push("Calculation mode");
  }

  const needsPhase =
    input.mode === "power-from-vi" || input.mode === "current-from-pv";

  if (needsPhase && !input.phaseSystem) {
    missingInputs.push(
      "Phase system (single-phase or three-phase) — never assumed",
    );
  }

  if (input.mode === "power-from-vi") {
    if (!isPositiveFinite(input.voltageV)) {
      missingInputs.push("Voltage (V)");
    }
    if (!isPositiveFinite(input.currentA)) {
      missingInputs.push("Current (A)");
    }
  }

  if (input.mode === "current-from-pv") {
    if (!isPositiveFinite(input.powerW) && !isPositiveFinite(input.powerKw)) {
      missingInputs.push("Power (W or kW)");
    }
    if (!isPositiveFinite(input.voltageV)) {
      missingInputs.push("Voltage (V)");
    }
    if (
      input.phaseSystem === "three-phase" &&
      input.powerFactor !== undefined &&
      !(input.powerFactor > 0 && input.powerFactor <= 1)
    ) {
      missingInputs.push("Power factor (must be > 0 and ≤ 1 when supplied)");
    }
  }

  if (input.mode === "kva-from-kw-pf" || input.mode === "kw-from-kva-pf") {
    if (
      input.powerFactor === undefined ||
      !(input.powerFactor > 0 && input.powerFactor <= 1)
    ) {
      missingInputs.push("Power factor (0 < pf ≤ 1)");
    }
  }

  if (input.mode === "kva-from-kw-pf" && !isPositiveFinite(input.powerKw)) {
    missingInputs.push("Real power (kW)");
  }

  if (
    input.mode === "kw-from-kva-pf" &&
    !isPositiveFinite(input.apparentPowerKva)
  ) {
    missingInputs.push("Apparent power (kVA)");
  }

  if (missingInputs.length > 0) {
    return {
      calculatorId: "power-current",
      title,
      ok: false,
      formula: formulaForMode(input),
      inputsUsed: collectInputs(input),
      results: [],
      assumptions,
      missingInputs,
      notes,
    };
  }

  if (input.mode === "power-from-vi") {
    const V = input.voltageV!;
    const I = input.currentA!;
    const phase = input.phaseSystem!;

    if (phase === "single-phase") {
      const P = V * I;
      assumptions.push("Single-phase power calculated as P = V × I (W).");
      return {
        calculatorId: "power-current",
        title,
        ok: true,
        formula: "P = V × I",
        inputsUsed: collectInputs(input),
        results: [
          { key: "powerW", label: "Power", value: formatNumber(P), unit: "W" },
          {
            key: "powerKw",
            label: "Power",
            value: formatNumber(P / 1000),
            unit: "kW",
          },
        ],
        assumptions,
        missingInputs: [],
        notes,
      };
    }

    const pf =
      input.powerFactor !== undefined &&
      input.powerFactor > 0 &&
      input.powerFactor <= 1
        ? input.powerFactor
        : undefined;

    if (pf === undefined) {
      missingInputs.push(
        "Power factor (required for three-phase power; not assumed)",
      );
      return {
        calculatorId: "power-current",
        title,
        ok: false,
        formula: "P = √3 × V × I × pf",
        inputsUsed: collectInputs(input),
        results: [],
        assumptions,
        missingInputs,
        notes,
      };
    }

    const P = SQRT_3 * V * I * pf;
    assumptions.push(
      "Three-phase real power calculated as P = √3 × V × I × pf (W).",
    );
    assumptions.push(`Power factor used: ${pf} (user-supplied).`);

    return {
      calculatorId: "power-current",
      title,
      ok: true,
      formula: "P = √3 × V × I × pf",
      inputsUsed: collectInputs(input),
      results: [
        { key: "powerW", label: "Power", value: formatNumber(P), unit: "W" },
        {
          key: "powerKw",
          label: "Power",
          value: formatNumber(P / 1000),
          unit: "kW",
        },
      ],
      assumptions,
      missingInputs: [],
      notes,
    };
  }

  if (input.mode === "current-from-pv") {
    const V = input.voltageV!;
    const P = isPositiveFinite(input.powerW)
      ? input.powerW
      : input.powerKw! * 1000;
    const phase = input.phaseSystem!;

    if (phase === "single-phase") {
      const I = P / V;
      assumptions.push("Single-phase current calculated as I = P / V.");
      return {
        calculatorId: "power-current",
        title,
        ok: true,
        formula: "I = P / V",
        inputsUsed: collectInputs(input),
        results: [
          {
            key: "currentA",
            label: "Current",
            value: formatNumber(I),
            unit: "A",
          },
        ],
        assumptions,
        missingInputs: [],
        notes,
      };
    }

    const pf =
      input.powerFactor !== undefined &&
      input.powerFactor > 0 &&
      input.powerFactor <= 1
        ? input.powerFactor
        : undefined;

    if (pf === undefined) {
      missingInputs.push(
        "Power factor (required for three-phase current; not assumed)",
      );
      return {
        calculatorId: "power-current",
        title,
        ok: false,
        formula: "I = P / (√3 × V × pf)",
        inputsUsed: collectInputs(input),
        results: [],
        assumptions,
        missingInputs,
        notes,
      };
    }

    const I = P / (SQRT_3 * V * pf);
    assumptions.push(
      "Three-phase current calculated as I = P / (√3 × V × pf).",
    );
    assumptions.push(`Power factor used: ${pf} (user-supplied).`);

    return {
      calculatorId: "power-current",
      title,
      ok: true,
      formula: "I = P / (√3 × V × pf)",
      inputsUsed: collectInputs(input),
      results: [
        { key: "currentA", label: "Current", value: formatNumber(I), unit: "A" },
      ],
      assumptions,
      missingInputs: [],
      notes,
    };
  }

  if (input.mode === "kva-from-kw-pf") {
    const kw = input.powerKw!;
    const pf = input.powerFactor!;
    const kva = kw / pf;
    assumptions.push("kVA = kW / pf using the user-supplied power factor.");

    return {
      calculatorId: "power-current",
      title,
      ok: true,
      formula: "kVA = kW / pf",
      inputsUsed: collectInputs(input),
      results: [
        {
          key: "apparentPowerKva",
          label: "Apparent power",
          value: formatNumber(kva),
          unit: "kVA",
        },
      ],
      assumptions,
      missingInputs: [],
      notes,
    };
  }

  // kw-from-kva-pf
  const kva = input.apparentPowerKva!;
  const pf = input.powerFactor!;
  const kw = kva * pf;
  assumptions.push("kW = kVA × pf using the user-supplied power factor.");

  return {
    calculatorId: "power-current",
    title,
    ok: true,
    formula: "kW = kVA × pf",
    inputsUsed: collectInputs(input),
    results: [
      { key: "powerKw", label: "Real power", value: formatNumber(kw), unit: "kW" },
    ],
    assumptions,
    missingInputs: [],
    notes,
  };
}

function formulaForMode(input: PowerCurrentInput): string {
  switch (input.mode) {
    case "power-from-vi":
      return input.phaseSystem === "three-phase"
        ? "P = √3 × V × I × pf"
        : "P = V × I";
    case "current-from-pv":
      return input.phaseSystem === "three-phase"
        ? "I = P / (√3 × V × pf)"
        : "I = P / V";
    case "kva-from-kw-pf":
      return "kVA = kW / pf";
    case "kw-from-kva-pf":
      return "kW = kVA × pf";
    default:
      return "Select a calculation mode";
  }
}

function collectInputs(input: PowerCurrentInput): CalcInputValue[] {
  const values: CalcInputValue[] = [];

  if (input.mode) {
    values.push({
      key: "mode",
      label: "Mode",
      value: input.mode,
    });
  }
  if (input.phaseSystem) {
    values.push({
      key: "phaseSystem",
      label: "Phase system",
      value: input.phaseSystem,
    });
  }
  if (isPositiveFinite(input.voltageV)) {
    values.push({
      key: "voltageV",
      label: "Voltage",
      value: input.voltageV,
      unit: "V",
    });
  }
  if (isPositiveFinite(input.currentA)) {
    values.push({
      key: "currentA",
      label: "Current",
      value: input.currentA,
      unit: "A",
    });
  }
  if (isPositiveFinite(input.powerW)) {
    values.push({
      key: "powerW",
      label: "Power",
      value: input.powerW,
      unit: "W",
    });
  }
  if (isPositiveFinite(input.powerKw)) {
    values.push({
      key: "powerKw",
      label: "Power",
      value: input.powerKw,
      unit: "kW",
    });
  }
  if (isPositiveFinite(input.apparentPowerKva)) {
    values.push({
      key: "apparentPowerKva",
      label: "Apparent power",
      value: input.apparentPowerKva,
      unit: "kVA",
    });
  }
  if (
    input.powerFactor !== undefined &&
    Number.isFinite(input.powerFactor)
  ) {
    values.push({
      key: "powerFactor",
      label: "Power factor",
      value: input.powerFactor,
    });
  }

  return values;
}
