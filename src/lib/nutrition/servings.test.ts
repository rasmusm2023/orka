import { describe, expect, it } from "vitest";
import { defaultGrams, gramsForQuantity } from "./servings";

describe("servings", () => {
  it("turns a count into grams", () => {
    expect(gramsForQuantity(2, 12)).toBe(24);
    expect(gramsForQuantity(0, 12)).toBe(0);
  });

  it("prefers the last logged amount, then a serving, then 100 g", () => {
    expect(defaultGrams(60, 12)).toBe(60);
    expect(defaultGrams(null, 12)).toBe(12);
    expect(defaultGrams(null, null)).toBe(100);
  });
});
