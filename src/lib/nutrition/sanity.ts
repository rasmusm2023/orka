export const lowCalorieKcalPer100g = 50;
const relativeTolerance = 0.15;
const lowCalorieToleranceKcal = 20;

export type AtwaterInput = {
  proteinG: number;
  carbsG: number;
  fatG: number;
  alcoholG?: number | null;
  fiberG?: number | null;
};

export function atwaterKcal(input: AtwaterInput): number {
  return (
    4 * input.proteinG +
    4 * input.carbsG +
    9 * input.fatG +
    7 * (input.alcoholG ?? 0) +
    2 * (input.fiberG ?? 0)
  );
}

export function nutritionDisagrees(
  statedKcal: number,
  input: AtwaterInput,
): boolean {
  const difference = Math.abs(statedKcal - atwaterKcal(input));
  if (statedKcal <= lowCalorieKcalPer100g) {
    return difference > lowCalorieToleranceKcal;
  }

  return difference > statedKcal * relativeTolerance;
}
