import { describe, expect, it } from "vitest";
import { calculateVoltageDrop } from "./voltageDrop";

describe("calculateVoltageDrop", () => {
  it("computes Vd from user-supplied total resistance", () => {
    const result = calculateVoltageDrop({
      currentA: 25,
      resistanceOhm: 0.2,
      systemVoltageV: 230,
    });

    expect(result.ok).toBe(true);
    expect(result.formula).toContain("Vd = I × R");
    expect(
      result.results.find((item) => item.key === "voltageDropV")?.value,
    ).toBe("5");
    expect(
      result.results.find((item) => item.key === "voltageDropPercent")?.value,
    ).toBe("2.1739");
  });

  it("does not invent resistance when only length is given", () => {
    const result = calculateVoltageDrop({
      currentA: 25,
      lengthM: 20,
    });

    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
    expect(
      result.missingInputs.some((item) => /resistance|impedance/i.test(item)),
    ).toBe(true);
  });

  it("derives R from per-km value and length", () => {
    const result = calculateVoltageDrop({
      currentA: 20,
      resistancePerKmOhm: 1.5,
      lengthM: 100,
    });

    expect(result.ok).toBe(true);
    expect(
      result.results.find((item) => item.key === "voltageDropV")?.value,
    ).toBe("3");
  });
});
