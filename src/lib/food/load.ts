import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchema, SchemaMissingError } from "@/lib/account/schema-error";
import { meals, type Meal } from "@/lib/nutrition/meals";
import { totalsFromGrams } from "@/lib/nutrition/entry";
import { foodColumns, foodHitRow, toFoodHit } from "./rows";
import type {
  FoodDay,
  FoodEntry,
  FoodHit,
  FoodSuggestions,
  ServingOption,
} from "./types";

function fail(error: { code?: string; message: string } | null) {
  if (!error) {
    return;
  }
  if (isMissingSchema(error)) {
    throw new SchemaMissingError();
  }
  throw new Error(error.message);
}

function missingFunction(error: { code?: string; message?: string }) {
  return error.code === "PGRST202" || error.code === "42883";
}

const embeddedName = z
  .union([
    z.object({
      name_sv: z.string(),
      name_en: z.string().nullable(),
    }),
    z.array(
      z.object({
        name_sv: z.string(),
        name_en: z.string().nullable(),
      }),
    ),
  ])
  .transform((value) => (Array.isArray(value) ? value[0] : value));

const embeddedHit = z
  .union([foodHitRow, z.array(foodHitRow)])
  .nullable()
  .transform((value) =>
    Array.isArray(value) ? (value[0] ?? null) : value,
  );

const logFoodRow = z.object({
  id: z.string(),
  meal: z.enum(meals),
  grams: z.union([z.number(), z.string()]).transform(Number),
  kcal_100: z.union([z.number(), z.string()]).transform(Number),
  protein_100: z.union([z.number(), z.string()]).transform(Number),
  carbs_100: z.union([z.number(), z.string()]).transform(Number),
  fat_100: z.union([z.number(), z.string()]).transform(Number),
  logged_at: z.string(),
  food_id: z.string(),
  foods: embeddedName,
});

const quickRow = z.object({
  id: z.string(),
  meal: z.enum(meals),
  label: z.string(),
  kcal: z.union([z.number(), z.string()]).transform(Number),
  protein_g: z.union([z.number(), z.string()]).transform(Number),
  carbs_g: z.union([z.number(), z.string()]).transform(Number),
  fat_g: z.union([z.number(), z.string()]).transform(Number),
  logged_at: z.string(),
});

export async function loadFoodDay(
  userId: string,
  date: string,
): Promise<FoodDay> {
  const supabase = await createClient();
  const [foods, quick] = await Promise.all([
    supabase
      .from("food_log_entries")
      .select(
        "id, meal, grams, kcal_100, protein_100, carbs_100, fat_100, logged_at, food_id, foods(name_sv, name_en)",
      )
      .eq("user_id", userId)
      .eq("log_date", date),
    supabase
      .from("quick_entries")
      .select("id, meal, label, kcal, protein_g, carbs_g, fat_g, logged_at")
      .eq("user_id", userId)
      .eq("log_date", date),
  ]);
  fail(foods.error);
  fail(quick.error);

  const foodEntries: Array<FoodEntry & { loggedAt: string }> = z
    .array(logFoodRow)
    .parse(foods.data ?? [])
    .map((row) => {
      const totals = totalsFromGrams(row.grams, {
        kcal: row.kcal_100,
        proteinG: row.protein_100,
        carbsG: row.carbs_100,
        fatG: row.fat_100,
      });
      const name = row.foods.name_sv;
      return {
        id: row.id,
        kind: "food" as const,
        meal: row.meal,
        name,
        grams: row.grams,
        kcal: totals.kcal,
        proteinG: totals.proteinG,
        carbsG: totals.carbsG,
        fatG: totals.fatG,
        foodId: row.food_id,
        loggedAt: row.logged_at,
      };
    });

  const quickEntries: Array<FoodEntry & { loggedAt: string }> = z
    .array(quickRow)
    .parse(quick.data ?? [])
    .map((row) => ({
      id: row.id,
      kind: "quick" as const,
      meal: row.meal,
      name: row.label,
      grams: null,
      kcal: row.kcal,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
      foodId: null,
      loggedAt: row.logged_at,
    }));

  const entries = [...foodEntries, ...quickEntries]
    .sort((left, right) => (left.loggedAt < right.loggedAt ? -1 : 1))
    .map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      meal: entry.meal,
      name: entry.name,
      grams: entry.grams,
      kcal: entry.kcal,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      foodId: entry.foodId,
    }));

  return { date, entries };
}

export async function searchFoods(query: string): Promise<FoodHit[]> {
  const q = query.trim().slice(0, 80);
  if (!q) {
    return [];
  }

  const supabase = await createClient();
  const searched = await supabase.rpc("search_foods", {
    raw_query: q,
    result_limit: 20,
  });

  if (searched.error && missingFunction(searched.error)) {
    const needle = q.replace(/[%_\\,]/g, "");
    const pattern = `%${needle}%`;
    const fallback = await supabase
      .from("foods")
      .select(foodColumns)
      .or(
        `name_sv.ilike.${pattern},name_en.ilike.${pattern},brand.ilike.${pattern},barcode.eq.${needle}`,
      )
      .limit(20);
    fail(fallback.error);
    return z.array(foodHitRow).parse(fallback.data ?? []).map(toFoodHit);
  }

  fail(searched.error);
  return z.array(foodHitRow).parse(searched.data ?? []).map(toFoodHit);
}

export async function loadSuggestions(
  userId: string,
  meal: Meal,
): Promise<FoodSuggestions> {
  const supabase = await createClient();
  const [recent, favorites, saved] = await Promise.all([
    supabase
      .from("food_log_entries")
      .select(`logged_at, foods(${foodColumns})`)
      .eq("user_id", userId)
      .eq("meal", meal)
      .order("logged_at", { ascending: false })
      .limit(40),
    supabase
      .from("favorite_foods")
      .select(`created_at, foods(${foodColumns})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("saved_meals")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
  ]);
  fail(recent.error);
  fail(favorites.error);
  fail(saved.error);

  const seen = new Set<string>();
  const recentHits: FoodHit[] = [];
  for (const row of z
    .array(z.object({ foods: embeddedHit }))
    .parse(recent.data ?? [])) {
    if (!row.foods || seen.has(row.foods.id)) {
      continue;
    }
    seen.add(row.foods.id);
    recentHits.push(toFoodHit(row.foods));
    if (recentHits.length === 8) {
      break;
    }
  }

  return {
    recent: recentHits,
    favorites: z
      .array(z.object({ foods: embeddedHit }))
      .parse(favorites.data ?? [])
      .flatMap((row) => (row.foods ? [toFoodHit(row.foods)] : [])),
    savedMeals: z
      .array(z.object({ id: z.string(), name: z.string() }))
      .parse(saved.data ?? []),
  };
}

export async function loadFoodDetail(userId: string, foodId: string) {
  const supabase = await createClient();
  const [last, servings, favorite] = await Promise.all([
    supabase
      .from("food_log_entries")
      .select("grams")
      .eq("user_id", userId)
      .eq("food_id", foodId)
      .order("logged_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("food_servings")
      .select("id, label_sv, label_en, grams")
      .eq("food_id", foodId),
    supabase
      .from("favorite_foods")
      .select("food_id")
      .eq("user_id", userId)
      .eq("food_id", foodId)
      .maybeSingle(),
  ]);
  fail(last.error);
  fail(servings.error);
  fail(favorite.error);

  const servingRows = z
    .array(
      z.object({
        id: z.string(),
        label_sv: z.string(),
        label_en: z.string().nullable(),
        grams: z.union([z.number(), z.string()]).transform(Number),
      }),
    )
    .parse(servings.data ?? []);

  const options: ServingOption[] = servingRows.map((row) => ({
    id: row.id,
    labelSv: row.label_sv,
    labelEn: row.label_en,
    grams: row.grams,
  }));

  const grams = last.data
    ? z
        .object({ grams: z.union([z.number(), z.string()]).transform(Number) })
        .parse(last.data).grams
    : null;

  return {
    lastGrams: grams,
    servings: options,
    favorite: favorite.data != null,
  };
}

export async function loadFoodById(foodId: string): Promise<FoodHit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .select(foodColumns)
    .eq("id", foodId)
    .maybeSingle();
  fail(error);
  if (!data) {
    return null;
  }
  return toFoodHit(foodHitRow.parse(data));
}
