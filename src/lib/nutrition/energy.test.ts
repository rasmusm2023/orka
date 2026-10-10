import { describe, expect, it } from "vitest";
import { kcalFromKj } from "./energy";

describe("kcal from kJ", () => {
  it("divides by 4.184 and does not round", () => {
    expect(kcalFromKj(3700)).toBeCloseTo(3700 / 4.184, 10);
    expect(kcalFromKj(0)).toBe(0);
  });
});
