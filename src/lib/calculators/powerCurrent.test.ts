import { describe, expect, it } from "vitest";
import { calculatePowerCurrent } from "./powerCurrent";

describe("calculatePowerCurrent", () => {
  it("calculates single-phase power deterministically", () => {
    const result = calculatePowerCurrent({
      mode: "power-from-vi",
      phaseSystem: "single-phase",
      voltageV: 230,
      currentA: 10,
    });

    expect(result.ok).toBe(true);
    expect(result.formula).toBe("P = V × I");
    expect(result.results.find((item) => item.key === "powerW")?.value).toBe(
      "2300",
    );
    expect(result.missingInputs).toEqual([]);
  });

  it("refuses to guess phase system", () => {
    const result = calculatePowerCurrent({
      mode: "power-from-vi",
      voltageV: 230,
      currentA: 10,
    });

    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.missingInputs.some((item) => /phase system/i.test(item))).toBe(
      true,
    );
  });

  it("requires power factor for three-phase current", () => {
    const result = calculatePowerCurrent({
      mode: "current-from-pv",
      phaseSystem: "three-phase",
      voltageV: 400,
      powerKw: 10,
    });

    expect(result.ok).toBe(false);
    expect(result.missingInputs.some((item) => /power factor/i.test(item))).toBe(
      true,
    );
  });

  it("converts kW to kVA with user pf", () => {
    const result = calculatePowerCurrent({
      mode: "kva-from-kw-pf",
      powerKw: 8,
      powerFactor: 0.8,
    });

    expect(result.ok).toBe(true);
    expect(result.formula).toBe("kVA = kW / pf");
    expect(
      result.results.find((item) => item.key === "apparentPowerKva")?.value,
    ).toBe("10");
  });
});
