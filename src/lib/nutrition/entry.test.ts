import { describe, expect, it } from "vitest";
import { sumTotals, totalsFromGrams } from "./entry";

const notTalg = {
  kcal: 884,
  proteinG: 0,
  carbsG: 0,
  fatG: 100,
};

describe("entry totals", () => {
  it("scales per 100 g values by the logged grams", () => {
    expect(totalsFromGrams(50, notTalg)).toMatchObject({
      kcal: 442,
      proteinG: 0,
      carbsG: 0,
      fatG: 50,
    });
  });

  it("returns zero for 0 g", () => {
    expect(totalsFromGrams(0, notTalg)).toMatchObject({
      kcal: 0,
      fatG: 0,
    });
  });

  it("keeps precision on a large amount", () => {
    expect(totalsFromGrams(100_000, { ...notTalg, kcal: 123.456 })).toMatchObject({
      kcal: 123456,
    });
  });

  it("leaves missing optional nutrients empty", () => {
    expect(totalsFromGrams(100, notTalg).fiberG).toBeNull();
  });

  it("sums raw entry values without rounding each one", () => {
    const entries = Array.from({ length: 100 }, () => ({
      kcal: 0.1,
      proteinG: 0.04,
      carbsG: 0.03,
      fatG: 0.02,
    }));
    const total = sumTotals(entries);
    expect(total.kcal).toBeCloseTo(10, 10);
    expect(total.proteinG).toBeCloseTo(4, 10);
    expect(total.carbsG).toBeCloseTo(3, 10);
    expect(total.fatG).toBeCloseTo(2, 10);
  });
});
