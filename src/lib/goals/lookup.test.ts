import { describe, expect, it } from "vitest";
import { goalForDate, type GoalSnapshot } from "./lookup";

function goal(
  overrides: Partial<GoalSnapshot> & Pick<GoalSnapshot, "effectiveFrom">,
): GoalSnapshot {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    kcal: 2000,
    proteinG: 140,
    carbsG: 200,
    fatG: 60,
    goalType: "maintain",
    targetRateKgPerWeek: 0,
    ...overrides,
  };
}

describe("goal for a date", () => {
  const goals = [
    goal({
      effectiveFrom: "2026-01-01",
      kcal: 2500,
      createdAt: "2026-01-01T08:00:00.000Z",
    }),
    goal({
      effectiveFrom: "2026-03-01",
      kcal: 2100,
      createdAt: "2026-03-01T08:00:00.000Z",
    }),
    goal({
      effectiveFrom: "2026-03-01",
      kcal: 1900,
      createdAt: "2026-03-01T18:00:00.000Z",
    }),
    goal({
      effectiveFrom: "2026-06-01",
      kcal: 2300,
      createdAt: "2026-06-01T08:00:00.000Z",
    }),
  ];

  it("uses the latest goal that had started on or before that day", () => {
    expect(goalForDate(goals, "2026-02-15")?.kcal).toBe(2500);
    expect(goalForDate(goals, "2026-03-01")?.kcal).toBe(1900);
    expect(goalForDate(goals, "2026-05-31")?.kcal).toBe(1900);
    expect(goalForDate(goals, "2026-06-01")?.kcal).toBe(2300);
  });

  it("returns nothing before the first goal", () => {
    expect(goalForDate(goals, "2025-12-31")).toBeNull();
  });

  it("leaves future goals out of earlier days", () => {
    expect(goalForDate(goals, "2026-01-01")?.kcal).toBe(2500);
  });
});
