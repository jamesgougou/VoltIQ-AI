import {
  formatNumber,
  isPositiveFinite,
  product,
} from "./helpers";
import type { CableSizingInput, CalcInputValue, CalcResult } from "./types";

/**
 * Cable sizing framework only — no AS/NZS 3008 tables.
 * User must supply CCC, derating factors, and Vd data explicitly.
 */
export function calculateCableSizing(input: CableSizingInput): CalcResult {
  const title = "Cable Sizing (Framework)";
  const missingInputs: string[] = [];
  const assumptions: string[] = [
    "No AS/NZS 3008 cable table is embedded. Current-carrying capacity and impedance/voltage-drop data must be user-supplied.",
  ];
  const notes: string[] = [
    "This framework checks design current against derated CCC and optional voltage-drop limits.",
    "It does not select a cable size from standards tables.",
    "This is a deterministic calculation result, not an AS/NZS requirement.",
  ];

  if (!isPositiveFinite(input.designCurrentA)) {
    missingInputs.push("Design current Ib (A)");
  }
  if (!input.material) {
    missingInputs.push("Conductor material (copper or aluminium)");
  }
  if (!input.arrangement?.trim()) {
    missingInputs.push("Conductor arrangement");
  }
  if (!input.installationMethod?.trim()) {
    missingInputs.push("Installation method / conditions");
  }
  if (!isPositiveFinite(input.currentCarryingCapacityA)) {
    missingInputs.push(
      "Current-carrying capacity Iz (A) from your cable data / standard table",
    );
  }
  if (!input.deratingFactors || input.deratingFactors.length === 0) {
    missingInputs.push(
      "Derating / correction factors (user-supplied; none are assumed)",
    );
  } else if (input.deratingFactors.some((factor) => !(factor > 0 && factor <= 1.5))) {
    missingInputs.push(
      "Derating factors must each be finite and > 0 (typically ≤ 1)",
    );
  }
  if (!isPositiveFinite(input.voltageDropLimitPercent)) {
    missingInputs.push("Allowable voltage drop limit (%)");
  }

  const hasVdPercent = isPositiveFinite(input.calculatedVoltageDropPercent);
  const canComputeVd =
    isPositiveFinite(input.circuitImpedanceOhm) &&
    isPositiveFinite(input.designCurrentA) &&
    isPositiveFinite(input.systemVoltageV);

  if (!hasVdPercent && !canComputeVd) {
    missingInputs.push(
      "Calculated voltage drop (%) or circuit impedance (Ω) with system voltage (V) to evaluate Vd",
    );
  }

  if (
    isPositiveFinite(input.circuitImpedanceOhm) &&
    !isPositiveFinite(input.systemVoltageV)
  ) {
    missingInputs.push(
      "System voltage (V) — required when using circuit impedance for %Vd",
    );
  }

  if (missingInputs.length > 0) {
    return {
      calculatorId: "cable-sizing",
      title,
      ok: false,
      formula:
        "Iz' = Iz × Π(derating factors);  check Ib ≤ Iz';  %Vd ≤ limit",
      inputsUsed: collectInputs(input),
      results: [],
      assumptions,
      missingInputs,
      notes,
    };
  }

  const Ib = input.designCurrentA!;
  const Iz = input.currentCarryingCapacityA!;
  const factors = input.deratingFactors!;
  const IzDerated = Iz * product(factors);
  const vdLimit = input.voltageDropLimitPercent!;

  let vdPercent: number;
  let formula =
    "Iz' = Iz × Π(derating factors);  check Ib ≤ Iz';  %Vd ≤ limit";

  if (hasVdPercent) {
    vdPercent = input.calculatedVoltageDropPercent!;
    assumptions.push(
      "Voltage drop percent was user-supplied (e.g. from the Voltage Drop calculator).",
    );
  } else {
    const Vd = Ib * input.circuitImpedanceOhm!;
    vdPercent = (Vd / input.systemVoltageV!) * 100;
    formula =
      "Iz' = Iz × Π(derating factors);  Vd = Ib × Z;  %Vd = (Vd / Vsystem) × 100;  check Ib ≤ Iz' and %Vd ≤ limit";
    assumptions.push(
      "Voltage drop computed from user-supplied circuit impedance Z and system voltage.",
    );
  }

  const cccOk = Ib <= IzDerated;
  const vdOk = vdPercent <= vdLimit;
  const ok = cccOk && vdOk;

  assumptions.push(
    `Material and installation are recorded as labels only (${input.material}, ${input.arrangement}, ${input.installationMethod}) — they do not alter table lookup because no cable table is embedded.`,
  );
  assumptions.push(
    `Derating factors applied exactly as supplied: ${factors.join(" × ")}.`,
  );

  return {
    calculatorId: "cable-sizing",
    title,
    ok,
    formula,
    inputsUsed: collectInputs(input),
    results: [
      {
        key: "izDerated",
        label: "Derated current-carrying capacity Iz'",
        value: formatNumber(IzDerated),
        unit: "A",
      },
      {
        key: "cccCheck",
        label: "Ib ≤ Iz' check",
        value: cccOk ? "PASS" : "FAIL",
      },
      {
        key: "voltageDropPercent",
        label: "Voltage drop",
        value: formatNumber(vdPercent),
        unit: "%",
      },
      {
        key: "vdCheck",
        label: "%Vd ≤ limit check",
        value: vdOk ? "PASS" : "FAIL",
      },
      {
        key: "overall",
        label: "Framework assessment",
        value: ok ? "PASS" : "FAIL",
      },
    ],
    assumptions,
    missingInputs: [],
    notes,
  };
}

function collectInputs(input: CableSizingInput): CalcInputValue[] {
  const values: CalcInputValue[] = [];

  if (isPositiveFinite(input.designCurrentA)) {
    values.push({
      key: "designCurrentA",
      label: "Design current Ib",
      value: input.designCurrentA,
      unit: "A",
    });
  }
  if (input.material) {
    values.push({
      key: "material",
      label: "Material",
      value: input.material,
    });
  }
  if (input.arrangement?.trim()) {
    values.push({
      key: "arrangement",
      label: "Arrangement",
      value: input.arrangement.trim(),
    });
  }
  if (input.installationMethod?.trim()) {
    values.push({
      key: "installationMethod",
      label: "Installation method",
      value: input.installationMethod.trim(),
    });
  }
  if (isPositiveFinite(input.currentCarryingCapacityA)) {
    values.push({
      key: "currentCarryingCapacityA",
      label: "CCC Iz",
      value: input.currentCarryingCapacityA,
      unit: "A",
    });
  }
  if (input.deratingFactors?.length) {
    values.push({
      key: "deratingFactors",
      label: "Derating factors",
      value: input.deratingFactors.join(" × "),
    });
  }
  if (isPositiveFinite(input.voltageDropLimitPercent)) {
    values.push({
      key: "voltageDropLimitPercent",
      label: "Vd limit",
      value: input.voltageDropLimitPercent,
      unit: "%",
    });
  }
  if (isPositiveFinite(input.calculatedVoltageDropPercent)) {
    values.push({
      key: "calculatedVoltageDropPercent",
      label: "Calculated Vd",
      value: input.calculatedVoltageDropPercent,
      unit: "%",
    });
  }
  if (isPositiveFinite(input.circuitImpedanceOhm)) {
    values.push({
      key: "circuitImpedanceOhm",
      label: "Circuit impedance",
      value: input.circuitImpedanceOhm,
      unit: "Ω",
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
  if (isPositiveFinite(input.lengthM)) {
    values.push({
      key: "lengthM",
      label: "Length",
      value: input.lengthM,
      unit: "m",
    });
  }

  return values;
}
