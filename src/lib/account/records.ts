import "server-only";
import { connection } from "next/server";
import { z } from "zod";
import { calendarDateInTimeZone } from "@/lib/dates/calendar";
import { goalForDate, type GoalSnapshot } from "@/lib/goals/lookup";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema, SchemaMissingError } from "./schema-error";

const goalRow = z.object({
  effective_from: z.string(),
  created_at: z.string(),
  kcal: z.union([z.number(), z.string()]).transform(Number),
  protein_g: z.union([z.number(), z.string()]).transform(Number),
  carbs_g: z.union([z.number(), z.string()]).transform(Number),
  fat_g: z.union([z.number(), z.string()]).transform(Number),
  goal_type: z.enum(["cut", "maintain", "bulk"]),
  target_rate_kg_per_week: z.union([z.number(), z.string()]).transform(Number),
});

function throwIfMissing(error: { code?: string; message: string } | null) {
  if (!error) {
    return;
  }
  if (isMissingSchema(error)) {
    throw new SchemaMissingError();
  }
  throw new Error(error.message);
}

export async function listGoals(userId: string): Promise<GoalSnapshot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select(
      "effective_from, created_at, kcal, protein_g, carbs_g, fat_g, goal_type, target_rate_kg_per_week",
    )
    .eq("user_id", userId);

  throwIfMissing(error);
  return (data ?? []).map((row) => {
    const parsed = goalRow.parse(row);
    return {
      effectiveFrom: parsed.effective_from,
      createdAt: parsed.created_at,
      kcal: parsed.kcal,
      proteinG: parsed.protein_g,
      carbsG: parsed.carbs_g,
      fatG: parsed.fat_g,
      goalType: parsed.goal_type,
      targetRateKgPerWeek: parsed.target_rate_kg_per_week,
    };
  });
}

export async function goalOnDate(
  userId: string,
  day: string,
): Promise<GoalSnapshot | null> {
  return goalForDate(await listGoals(userId), day);
}

export async function weightOnDate(
  userId: string,
  day: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .eq("user_id", userId)
    .eq("log_date", day)
    .maybeSingle();

  throwIfMissing(error);
  if (data?.weight_kg == null) {
    return null;
  }

  const weight = Number(data.weight_kg);
  return Number.isFinite(weight) ? weight : null;
}

export async function latestWeight(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_metrics")
    .select("weight_kg, log_date")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("log_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfMissing(error);
  if (data?.weight_kg == null) {
    return null;
  }

  const weight = Number(data.weight_kg);
  return Number.isFinite(weight) ? weight : null;
}

export async function loggedDates(
  userId: string,
  from: string,
  to: string,
): Promise<string[]> {
  const supabase = await createClient();
  const tables = [
    "food_log_entries",
    "quick_entries",
    "workout_sessions",
    "body_metrics",
  ] as const;
  const dates = new Set<string>();

  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", from)
        .lte("log_date", to);

      throwIfMissing(error);
      for (const row of data ?? []) {
        if (typeof row.log_date === "string") {
          dates.add(row.log_date);
        }
      }
    }),
  );

  return [...dates];
}

export async function todayForTimezone(
  timeZone: string,
  instant?: Date,
): Promise<string> {
  let now = instant;
  if (!now) {
    await connection();
    now = new Date();
  }

  return calendarDateInTimeZone(timeZone, now);
}
