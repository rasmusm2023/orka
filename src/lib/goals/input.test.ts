import { describe, expect, it } from "vitest";
import { goalInputSchema, parseDecimal } from "./input";

const valid = {
  sex: "female" as const,
  birthDate: "1996-04-02",
  heightCm: 168,
  weightKg: 64.5,
  activityLevel: "moderate" as const,
  goalType: "maintain" as const,
  kcal: 2100,
  proteinG: 129,
  carbsG: 220,
  fatG: 51.6,
};

describe("goal input", () => {
  it("accepts a complete target", () => {
    expect(goalInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a negative calorie target", () => {
    expect(goalInputSchema.safeParse({ ...valid, kcal: -1 }).success).toBe(
      false,
    );
  });

  it("parses Swedish decimals and rejects anything else", () => {
    expect(parseDecimal("82,4")).toBe(82.4);
    expect(parseDecimal("1 240")).toBe(1240);
    expect(parseDecimal("-5")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });
});
