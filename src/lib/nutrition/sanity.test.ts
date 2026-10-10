import { describe, expect, it } from "vitest";
import { atwaterKcal, nutritionDisagrees } from "./sanity";

describe("Atwater sanity check", () => {
  it("uses 4, 4, 9, 7 and 2 kcal per gram", () => {
    expect(
      atwaterKcal({
        proteinG: 10,
        carbsG: 10,
        fatG: 10,
        alcoholG: 10,
        fiberG: 10,
      }),
    ).toBe(4 * 10 + 4 * 10 + 9 * 10 + 7 * 10 + 2 * 10);
  });

  it("treats missing alcohol and fiber as zero", () => {
    expect(atwaterKcal({ proteinG: 1, carbsG: 1, fatG: 1 })).toBe(17);
  });

  it("flags a packaged food whose kcal is more than 15% off", () => {
    const input = { proteinG: 3.1, carbsG: 3.4, fatG: 12 };
    expect(atwaterKcal(input)).toBeCloseTo(134, 5);
    expect(nutritionDisagrees(100, input)).toBe(true);
    expect(nutritionDisagrees(130, input)).toBe(false);
  });

  it("uses a 20 kcal band for low-calorie foods", () => {
    const input = { proteinG: 1, carbsG: 2, fatG: 0.2 };
    expect(nutritionDisagrees(12, input)).toBe(false);
    expect(nutritionDisagrees(40, input)).toBe(true);
  });
});
