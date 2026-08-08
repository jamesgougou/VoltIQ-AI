import {
  formatNumber,
  isPositiveFinite,
} from "./helpers";
import type { CalcInputValue, CalcResult, VoltageDropInput } from "./types";

/**
 * Voltage drop using user-supplied resistance/impedance only.
 * Never invents cable R/Z values.
 */
export function calculateVoltageDrop(input: VoltageDropInput): CalcResult {
  const title = "Voltage Drop";
  const missingInputs: string[] = [];
  const assumptions: string[] = [];
  const notes: string[] = [
    "This is a deterministic calculation result, not an AS/NZS requirement.",
    "Cable resistance/impedance must be supplied by the user (or sourced from uploaded standards in a later lookup layer).",
  ];

  if (!isPositiveFinite(input.currentA)) {
    missingInputs.push("Current (A)");
  }

  const hasTotalR = isPositiveFinite(input.resistanceOhm);
  const hasTotalZ = isPositiveFinite(input.impedanceOhm);
  const hasPerKmR =
    isPositiveFinite(input.resistancePerKmOhm) &&
    isPositiveFinite(input.lengthM);
  const hasPerKmZ =
    isPositiveFinite(input.impedancePerKmOhm) &&
    isPositiveFinite(input.lengthM);

  if (!hasTotalR && !hasTotalZ && !hasPerKmR && !hasPerKmZ) {
    missingInputs.push(
      "Circuit resistance R (Ω) or impedance Z (Ω), or per-km R/Z with length (m)",
    );
  }

  if (
    (isPositiveFinite(input.resistancePerKmOhm) ||
      isPositiveFinite(input.impedancePerKmOhm)) &&
    !isPositiveFinite(input.lengthM)
  ) {
    missingInputs.push("Cable length (m) — required when using per-km R/Z");
  }

  if (
    isPositiveFinite(input.lengthM) &&
    !isPositiveFinite(input.resistancePerKmOhm) &&
    !isPositiveFinite(input.impedancePerKmOhm) &&
    !hasTotalR &&
    !hasTotalZ
  ) {
    missingInputs.push(
      "Resistance or impedance per km (Ω/km) — length alone is not enough",
    );
  }

  if (missingInputs.length > 0) {
    return {
      calculatorId: "voltage-drop",
      title,
      ok: false,
      formula: "Vd = I × R  or  Vd = I × Z",
      inputsUsed: collectInputs(input),
      results: [],
      assumptions,
      missingInputs,
      notes,
    };
  }

  const I = input.currentA!;
  let resistanceOrImpedance: number;
  let formula: string;
  let quantityLabel: "R" | "Z";

  if (hasTotalR) {
    resistanceOrImpedance = input.resistanceOhm!;
    formula = "Vd = I × R";
    quantityLabel = "R";
    assumptions.push("Using user-supplied total circuit resistance R (Ω).");
  } else if (hasTotalZ) {
    resistanceOrImpedance = input.impedanceOhm!;
    formula = "Vd = I × Z";
    quantityLabel = "Z";
    assumptions.push("Using user-supplied total circuit impedance Z (Ω).");
  } else if (hasPerKmR) {
    resistanceOrImpedance =
      (input.resistancePerKmOhm! * input.lengthM!) / 1000;
    formula = "R = r × L / 1000;  Vd = I × R";
    quantityLabel = "R";
    assumptions.push(
      "Total R derived from user-supplied r (Ω/km) and length L (m): R = r × L / 1000.",
    );
  } else {
    resistanceOrImpedance =
      (input.impedancePerKmOhm! * input.lengthM!) / 1000;
    formula = "Z = z × L / 1000;  Vd = I × Z";
    quantityLabel = "Z";
    assumptions.push(
      "Total Z derived from user-supplied z (Ω/km) and length L (m): Z = z × L / 1000.",
    );
  }

  const vd = I * resistanceOrImpedance;
  const results = [
    {
      key: "voltageDropV",
      label: "Voltage drop",
      value: formatNumber(vd),
      unit: "V",
    },
    {
      key: "circuitRZ",
      label: quantityLabel === "R" ? "Circuit resistance used" : "Circuit impedance used",
      value: formatNumber(resistanceOrImpedance),
      unit: "Ω",
    },
  ];

  if (isPositiveFinite(input.systemVoltageV)) {
    const percent = (vd / input.systemVoltageV) * 100;
    results.push({
      key: "voltageDropPercent",
      label: "Voltage drop",
      value: formatNumber(percent),
      unit: "%",
    });
    assumptions.push(
      "%Vd = (Vd / Vsystem) × 100 using user-supplied system voltage.",
    );
    formula = `${formula};  %Vd = (Vd / Vsystem) × 100`;
  } else {
    notes.push(
      "System voltage was not supplied, so % voltage drop was not calculated.",
    );
  }

  return {
    calculatorId: "voltage-drop",
    title,
    ok: true,
    formula,
    inputsUsed: collectInputs(input),
    results,
    assumptions,
    missingInputs: [],
    notes,
  };
}

function collectInputs(input: VoltageDropInput): CalcInputValue[] {
  const values: CalcInputValue[] = [];

  if (isPositiveFinite(input.currentA)) {
    values.push({
      key: "currentA",
      label: "Current",
      value: input.currentA,
      unit: "A",
    });
  }
  if (isPositiveFinite(input.resistanceOhm)) {
    values.push({
      key: "resistanceOhm",
      label: "Total resistance",
      value: input.resistanceOhm,
      unit: "Ω",
    });
  }
  if (isPositiveFinite(input.impedanceOhm)) {
    values.push({
      key: "impedanceOhm",
      label: "Total impedance",
      value: input.impedanceOhm,
      unit: "Ω",
    });
  }
  if (isPositiveFinite(input.resistancePerKmOhm)) {
    values.push({
      key: "resistancePerKmOhm",
      label: "Resistance per km",
      value: input.resistancePerKmOhm,
      unit: "Ω/km",
    });
  }
  if (isPositiveFinite(input.impedancePerKmOhm)) {
    values.push({
      key: "impedancePerKmOhm",
      label: "Impedance per km",
      value: input.impedancePerKmOhm,
      unit: "Ω/km",
    });
  }
  if (isPositiveFinite(input.lengthM)) {
    values.push({
      key: "lengthM",
      label: "Length",
      value: input.lengthM,
      unit: "m",
    });
  }
  if (isPositiveFinite(input.systemVoltageV)) {
    values.push({
      key: "systemVoltageV",
      label: "System voltage",
      value: input.systemVoltageV,
      unit: "V",
    });
  }

  return values;
}
