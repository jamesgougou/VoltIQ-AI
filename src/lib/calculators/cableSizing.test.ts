import { describe, expect, it } from "vitest";
import { calculateCableSizing } from "./cableSizing";

describe("calculateCableSizing", () => {
  it("requires CCC and derating factors — no table lookup", () => {
    const result = calculateCableSizing({
      designCurrentA: 20,
      material: "copper",
      arrangement: "multicore",
      installationMethod: "clipped direct",
      voltageDropLimitPercent: 5,
      calculatedVoltageDropPercent: 2,
    });

    expect(result.ok).toBe(false);
    expect(
      result.missingInputs.some((item) => /current-carrying capacity/i.test(item)),
    ).toBe(true);
    expect(
      result.missingInputs.some((item) => /derating/i.test(item)),
    ).toBe(true);
  });

  it("passes framework checks with explicit user data", () => {
    const result = calculateCableSizing({
      designCurrentA: 20,
      material: "copper",
      arrangement: "multicore",
      installationMethod: "clipped direct",
      currentCarryingCapacityA: 32,
      deratingFactors: [0.9, 0.95],
      voltageDropLimitPercent: 5,
      calculatedVoltageDropPercent: 3,
    });

    expect(result.ok).toBe(true);
    expect(result.results.find((item) => item.key === "overall")?.value).toBe(
      "PASS",
    );
    expect(
      result.assumptions.some((item) => /no AS\/NZS 3008/i.test(item)),
    ).toBe(true);
  });
});
