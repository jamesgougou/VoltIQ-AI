import { describe, expect, it } from "vitest";
import { calculateMaxDemand } from "./maxDemand";

describe("calculateMaxDemand", () => {
  it("does not invent diversity factors", () => {
    const result = calculateMaxDemand({
      loads: [{ name: "Lighting", loadA: 10 }],
    });

    expect(result.ok).toBe(false);
    expect(result.results).toEqual([]);
    expect(
      result.missingInputs.some((item) => /diversity factor/i.test(item)),
    ).toBe(true);
  });

  it("sums loads with explicit diversity", () => {
    const result = calculateMaxDemand({
      loads: [
        { name: "Lighting", loadA: 10, diversityFactor: 1 },
        { name: "Power", loadA: 20, diversityFactor: 0.5 },
      ],
    });

    expect(result.ok).toBe(true);
    expect(
      result.results.find((item) => item.key === "maxDemandA")?.value,
    ).toBe("20");
    expect(result.formula).toBe("MD = Σ (load × diversity factor)");
  });
});
