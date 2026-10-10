export const activityLevels = [
  "sedentary",
  "light",
  "moderate",
  "high",
  "very_high",
] as const;

export const goalTypes = ["cut", "maintain", "bulk"] as const;

export const sexes = ["male", "female"] as const;

export type ActivityLevel = (typeof activityLevels)[number];
export type GoalType = (typeof goalTypes)[number];
export type Sex = (typeof sexes)[number];

export const activityFactors: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

export const goalKcalFactors: Record<GoalType, number> = {
  cut: 0.8,
  maintain: 1,
  bulk: 1.1,
};

const proteinGramsPerKg = 2;
const fatGramsPerKg = 0.8;
const kcalPerKgBodyChange = 7700;

export function targetRateKgPerWeek(tdee: number, kcal: number): number {
  return ((kcal - tdee) * 7) / kcalPerKgBodyChange;
}

export type TargetInput = {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalType: GoalType;
};

export type Targets = {
  bmr: number;
  tdee: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  targetRateKgPerWeek: number;
};

export function ageOnDate(birthDate: string, onDate: string): number {
  const birth = birthDate.split("-").map(Number);
  const on = onDate.split("-").map(Number);
  if (birth.length !== 3 || on.length !== 3) {
    throw new Error("Age needs two ISO dates.");
  }

  let age = on[0] - birth[0];
  const beforeBirthday =
    on[1] < birth[1] || (on[1] === birth[1] && on[2] < birth[2]);
  if (beforeBirthday) {
    age -= 1;
  }

  return age;
}

export function calculateTargets(input: TargetInput): Targets {
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.ageYears +
    (input.sex === "male" ? 5 : -161);
  const tdee = bmr * activityFactors[input.activityLevel];
  const kcal = tdee * goalKcalFactors[input.goalType];
  const proteinG = proteinGramsPerKg * input.weightKg;
  const fatG = fatGramsPerKg * input.weightKg;
  const carbsG = Math.max(0, (kcal - 4 * proteinG - 9 * fatG) / 4);

  return {
    bmr,
    tdee,
    kcal,
    proteinG,
    carbsG,
    fatG,
    targetRateKgPerWeek: targetRateKgPerWeek(tdee, kcal),
  };
}

export function displayKcal(value: number): number {
  return Math.round(value);
}

export function displayGrams(value: number): number {
  return Math.round(value * 10) / 10;
}
