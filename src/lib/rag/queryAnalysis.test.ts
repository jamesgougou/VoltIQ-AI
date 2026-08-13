import { describe, expect, it } from "vitest";
import {
  analyzeQuery,
  chunkContainsExactMatch,
} from "./queryAnalysis";

describe("analyzeQuery clause exact-match", () => {
  it("detects Clause 2.5 and clause 2.5", () => {
    for (const query of ["Clause 2.5", "clause 2.5", "cl. 2.5"]) {
      const profile = analyzeQuery(query);
      expect(profile.exactMatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "clause",
            label: "Clause 2.5",
          }),
        ]),
      );
    }
  });

  it("detects AS/NZS 3000 Clause 2.5", () => {
    const profile = analyzeQuery("AS/NZS 3000 Clause 2.5");
    expect(profile.exactMatches.some((m) => m.label === "Clause 2.5")).toBe(
      true,
    );
    expect(profile.exactMatches.some((m) => m.type === "standard")).toBe(true);
  });

  it("detects hierarchical bare 2.5.1", () => {
    const profile = analyzeQuery("2.5.1");
    expect(profile.exactMatches).toEqual([
      expect.objectContaining({
        type: "clause",
        label: "Clause 2.5.1",
      }),
    ]);
  });

  it("does not treat bare 2.5 as an exact clause target", () => {
    const profile = analyzeQuery("2.5");
    expect(profile.exactMatches).toEqual([]);
  });

  it("does not promote measurement 2.5 when the word clause appears", () => {
    const profile = analyzeQuery("which clause covers 2.5 mm cable");
    expect(
      profile.exactMatches.some((match) => match.label === "Clause 2.5"),
    ).toBe(false);
  });
});

describe("chunkContainsExactMatch for clauses", () => {
  const clause25 = analyzeQuery("Clause 2.5").exactMatches[0]!;

  it("matches anchored clause text", () => {
    expect(
      chunkContainsExactMatch("See Clause 2.5 for RCD requirements.", clause25),
    ).toBe(true);
  });

  it("does not match cable size 2.5 mm²", () => {
    expect(
      chunkContainsExactMatch("use 2.5 mm² conductors", clause25),
    ).toBe(false);
  });

  it("does not match longer numbers like 12.5 or 2.51", () => {
    expect(chunkContainsExactMatch("rated 12.5 A", clause25)).toBe(false);
    expect(chunkContainsExactMatch("value 2.51", clause25)).toBe(false);
  });
});
