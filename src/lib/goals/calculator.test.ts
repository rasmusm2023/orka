import { describe, expect, it } from "vitest";
import {
  ageOnDate,
  calculateTargets,
  displayGrams,
  displayKcal,
} from "./calculator";

describe("Mifflin–St Jeor targets", () => {
  it("calculates a cut for a 30-year-old man", () => {
    const targets = calculateTargets({
      sex: "male",
      ageYears: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      goalType: "cut",
    });

    expect(targets.bmr).toBe(1780);
    expect(targets.tdee).toBeCloseTo(2759, 5);
    expect(targets.kcal).toBeCloseTo(2207.2, 5);
    expect(targets.proteinG).toBe(160);
    expect(targets.fatG).toBe(64);
    expect(targets.carbsG).toBeCloseTo(247.8, 5);
    expect(targets.targetRateKgPerWeek).toBeCloseTo(-0.5016363636, 5);
  });

  it("calculates maintenance for a 30-year-old woman", () => {
    const targets = calculateTargets({
      sex: "female",
      ageYears: 30,
      heightCm: 165,
      weightKg: 60,
      activityLevel: "sedentary",
      goalType: "maintain",
    });

    expect(targets.bmr).toBeCloseTo(1320.25, 5);
    expect(targets.tdee).toBeCloseTo(1584.3, 5);
    expect(targets.kcal).toBeCloseTo(1584.3, 5);
    expect(targets.proteinG).toBe(120);
    expect(targets.fatG).toBe(48);
    expect(targets.carbsG).toBeCloseTo(168.075, 5);
    expect(targets.targetRateKgPerWeek).toBe(0);
  });

  it("adds about ten percent for a bulk", () => {
    const maintain = calculateTargets({
      sex: "male",
      ageYears: 40,
      heightCm: 175,
      weightKg: 75,
      activityLevel: "light",
      goalType: "maintain",
    });
    const bulk = calculateTargets({
      sex: "male",
      ageYears: 40,
      heightCm: 175,
      weightKg: 75,
      activityLevel: "light",
      goalType: "bulk",
    });

    expect(bulk.kcal).toBeCloseTo(maintain.tdee * 1.1, 5);
    expect(bulk.targetRateKgPerWeek).toBeGreaterThan(0);
  });

  it("does not invent negative carbs when protein and fat already fill the calories", () => {
    const targets = calculateTargets({
      sex: "female",
      ageYears: 60,
      heightCm: 150,
      weightKg: 150,
      activityLevel: "sedentary",
      goalType: "cut",
    });

    expect(4 * targets.proteinG + 9 * targets.fatG).toBeGreaterThan(
      targets.kcal,
    );
    expect(targets.carbsG).toBe(0);
  });

  it("counts completed years, including the day before a birthday", () => {
    expect(ageOnDate("1996-10-11", "2026-10-10")).toBe(29);
    expect(ageOnDate("1996-10-10", "2026-10-10")).toBe(30);
  });
});

describe("display rounding", () => {
  it("rounds calories to integers and grams to one decimal", () => {
    expect(displayKcal(2207.2)).toBe(2207);
    expect(displayKcal(2207.5)).toBe(2208);
    expect(displayGrams(247.84)).toBe(247.8);
    expect(displayGrams(247.85)).toBe(247.9);
    expect(displayGrams(0)).toBe(0);
  });
});
