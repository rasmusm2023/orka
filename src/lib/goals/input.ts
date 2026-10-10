import { z } from "zod";
import { isIsoDate } from "@/lib/dates/calendar";
import { activityLevels, goalTypes, sexes } from "@/lib/goals/calculator";

export const goalInputSchema = z.object({
  sex: z.enum(sexes),
  birthDate: z.string().refine(isIsoDate),
  heightCm: z.number().positive().max(300),
  weightKg: z.number().positive().max(500),
  activityLevel: z.enum(activityLevels),
  goalType: z.enum(goalTypes),
  kcal: z.number().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatG: z.number().min(0),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
