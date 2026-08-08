import { formatNumber, isPositiveFinite } from "./helpers";
import type { CalcInputValue, CalcResult, MaxDemandInput } from "./types";

/**
 * Maximum demand from user-supplied loads and diversity factors only.
 * Never invents default diversity factors.
 */
export function calculateMaxDemand(input: MaxDemandInput): CalcResult {
  const title = "Maximum Demand";
  const missingInputs: string[] = [];
  const assumptions: string[] = [
    "No default diversity factors are applied. Every load must include an explicit user-supplied diversity factor.",
  ];
  const notes: string[] = [
    "This is a deterministic calculation result, not an AS/NZS requirement.",
    "Diversity rules from standards must be entered by the user (or sourced from uploaded documents separately).",
  ];

  const loads = input.loads ?? [];

  if (loads.length === 0) {
    missingInputs.push("At least one load with current (A) and diversity factor");
  }

  loads.forEach((load, index) => {
    const n = index + 1;
    if (!load.name?.trim()) {
      missingInputs.push(`Load ${n}: name`);
    }
    if (!isPositiveFinite(load.loadA)) {
      missingInputs.push(`Load ${n}: load current (A)`);
    }
    if (
      load.diversityFactor === undefined ||
      !Number.isFinite(load.diversityFactor) ||
      load.diversityFactor <= 0 ||
      load.diversityFactor > 1
    ) {
      missingInputs.push(
        `Load ${n}: diversity factor (0 < factor ≤ 1; not assumed)`,
      );
    }
  });

  if (missingInputs.length > 0) {
    return {
      calculatorId: "max-demand",
      title,
      ok: false,
      formula: "MD = Σ (load × diversity factor)",
      inputsUsed: collectInputs(input),
      results: [],
      assumptions,
      missingInputs,
      notes,
    };
  }

  let total = 0;
  const perLoadResults = loads.map((load, index) => {
    const after = load.loadA! * load.diversityFactor!;
    total += after;
    return {
      key: `load-${index + 1}`,
      label: `${load.name.trim()} after diversity`,
      value: formatNumber(after),
      unit: "A",
    };
  });

  assumptions.push(
    "Each diversity factor was applied exactly as entered by the user.",
  );

  return {
    calculatorId: "max-demand",
    title,
    ok: true,
    formula: "MD = Σ (load × diversity factor)",
    inputsUsed: collectInputs(input),
    results: [
      ...perLoadResults,
      {
        key: "maxDemandA",
        label: "Maximum demand",
        value: formatNumber(total),
        unit: "A",
      },
    ],
    assumptions,
    missingInputs: [],
    notes,
  };
}

function collectInputs(input: MaxDemandInput): CalcInputValue[] {
  const values: CalcInputValue[] = [];
  const loads = input.loads ?? [];

  loads.forEach((load, index) => {
    const n = index + 1;
    if (load.name?.trim()) {
      values.push({
        key: `name-${n}`,
        label: `Load ${n} name`,
        value: load.name.trim(),
      });
    }
    if (isPositiveFinite(load.loadA)) {
      values.push({
        key: `loadA-${n}`,
        label: `Load ${n} current`,
        value: load.loadA,
        unit: "A",
      });
    }
    if (
      load.diversityFactor !== undefined &&
      Number.isFinite(load.diversityFactor)
    ) {
      values.push({
        key: `diversity-${n}`,
        label: `Load ${n} diversity`,
        value: load.diversityFactor,
      });
    }
  });

  return values;
}
