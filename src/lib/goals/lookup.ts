export type GoalSnapshot = {
  effectiveFrom: string;
  createdAt: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  goalType: "cut" | "maintain" | "bulk";
  targetRateKgPerWeek: number;
};

export function goalForDate(
  goals: GoalSnapshot[],
  day: string,
): GoalSnapshot | null {
  const eligible = goals.filter((goal) => goal.effectiveFrom <= day);
  eligible.sort((left, right) => {
    if (left.effectiveFrom !== right.effectiveFrom) {
      return left.effectiveFrom < right.effectiveFrom ? 1 : -1;
    }

    if (left.createdAt === right.createdAt) {
      return 0;
    }

    return left.createdAt < right.createdAt ? 1 : -1;
  });

  return eligible[0] ?? null;
}
