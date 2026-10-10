"use server";

import { z } from "zod";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/account/current-user";
import { addCalendarDays, isIsoDate } from "@/lib/dates/calendar";
import { createClient } from "@/lib/supabase/server";
import { meals, type Meal } from "@/lib/nutrition/meals";
import { nutritionDisagrees } from "@/lib/nutrition/sanity";
import type { Per100 } from "@/lib/nutrition/entry";
import type { OffProduct } from "@/lib/nutrition/off";
import {
  loadFoodById,
  loadFoodDay,
  loadFoodDetail,
  loadSuggestions,
  searchFoods,
} from "./load";
import { fetchOffBarcode, searchOffProducts } from "./off-client";
import {
  catalogFood,
  nutrientsFor,
  searchOfficialFoods,
} from "./slv-catalog";
import type { FoodDay, FoodHit, Restorable } from "./types";

function asLocale(value: string): AppLocale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

async function requireUser(locale: AppLocale) {
  const safe = asLocale(locale);
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    redirect({ href: "/logga-in", locale: safe });
  }
  const user = result.status === "ready" ? result.user : null;
  return user;
}

function brandedHit(product: OffProduct): FoodHit {
  return {
    id: `off:${product.code}`,
    nameSv: product.nameSv,
    nameEn: product.nameEn,
    brand: product.brand,
    barcode: product.code,
    source: "openfoodfacts",
    kcal: product.per100.kcal,
    proteinG: product.per100.proteinG,
    carbsG: product.per100.carbsG,
    fatG: product.per100.fatG,
    fiberG: product.per100.fiberG ?? null,
    sugarG: product.per100.sugarG ?? null,
    saltG: product.per100.saltG ?? null,
    alcoholG: product.per100.alcoholG ?? null,
    isVerified: false,
  };
}

function per100Of(food: FoodHit): Per100 {
  return {
    kcal: food.kcal,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    fiberG: food.fiberG,
    sugarG: food.sugarG,
    saltG: food.saltG,
    alcoholG: food.alcoholG,
  };
}

const gramsSchema = z.number().positive().max(5000);
const mealSchema = z.enum(meals);
const dateSchema = z.string().refine(isIsoDate);

async function dayOrSave(
  userId: string,
  date: string,
): Promise<{ day: FoodDay } | { error: "save" }> {
  try {
    return { day: await loadFoodDay(userId, date) };
  } catch {
    return { error: "save" };
  }
}

export async function refreshFoodDay(date: string, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user || !isIsoDate(date)) {
    return null;
  }
  return loadFoodDay(user.id, date);
}

export async function suggestFoods(meal: Meal, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user || !mealSchema.safeParse(meal).success) {
    return { recent: [], favorites: [], savedMeals: [] };
  }
  return loadSuggestions(user.id, meal);
}

export async function findFoods(query: string, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user) {
    return { foods: [] as FoodHit[], branded: [] as FoodHit[] };
  }

  const [official, local, packaged] = await Promise.all([
    searchOfficialFoods(query),
    searchFoods(query),
    searchOffProducts(query),
  ]);
  const own = local.filter((food) => food.source === "user" && !food.id.startsWith("slv:"));
  const names = new Set(
    official.map((food) => food.nameSv.toLocaleLowerCase("sv-SE")),
  );
  const knownCodes = new Set(
    local.flatMap((food) => (food.barcode ? [food.barcode] : [])),
  );

  return {
    foods: [
      ...official,
      ...own.filter(
        (food) => !names.has(food.nameSv.toLocaleLowerCase("sv-SE")),
      ),
    ].slice(0, 12),
    branded: packaged
      .filter((product) => !knownCodes.has(product.code))
      .map(brandedHit),
  };
}

export async function openLivsmedel(nummer: number, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user) {
    return { error: "save" as const };
  }

  const listed = catalogFood(nummer);
  const per100 = listed ? await nutrientsFor(nummer) : null;
  if (!listed || !per100) {
    return { error: "missing" as const };
  }

  const supabase = await createClient();
  const cached = await supabase.rpc("upsert_livsmedel", {
    p_source_id: String(nummer),
    p_name_sv: listed.nameSv,
    p_name_en: listed.nameEn ?? "",
    p_kcal: per100.kcal,
    p_protein_g: per100.proteinG,
    p_carbs_g: per100.carbsG,
    p_fat_g: per100.fatG,
    p_fiber_g: per100.fiberG,
    p_sugar_g: per100.sugarG,
    p_salt_g: per100.saltG,
    p_alcohol_g: per100.alcoholG,
    p_source_version: "",
  });

  if (!cached.error && typeof cached.data === "string") {
    const food = await loadFoodById(cached.data);
    if (food) {
      return { food };
    }
  }

  const sourceId = `slv:${nummer}`;
  const existing = await supabase
    .from("foods")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (existing.data?.id) {
    const food = await loadFoodById(existing.data.id);
    if (food) {
      return { food: { ...food, source: "livsmedelsverket" as const } };
    }
  }

  const inserted = await supabase
    .from("foods")
    .insert({
      source: "user",
      source_id: sourceId,
      owner_user_id: user.id,
      name_sv: listed.nameSv,
      name_en: listed.nameEn,
      kcal: per100.kcal,
      protein_g: per100.proteinG,
      carbs_g: per100.carbsG,
      fat_g: per100.fatG,
      fiber_g: per100.fiberG,
      sugar_g: per100.sugarG,
      salt_g: per100.saltG,
      alcohol_g: per100.alcoholG,
      is_verified: true,
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) {
    return { error: "save" as const };
  }

  const food = await loadFoodById(inserted.data.id);
  if (!food) {
    return { error: "save" as const };
  }
  return { food: { ...food, source: "livsmedelsverket" as const } };
}

export async function foodAmount(foodId: string, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user) {
    return null;
  }
  return loadFoodDetail(user.id, foodId);
}

export async function logFood(
  input: {
    foodId: string;
    meal: Meal;
    date: string;
    grams: number;
  },
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  if (!user) {
    return { error: "save" as const };
  }

  const parsed = z
    .object({
      foodId: z.string().min(1),
      meal: mealSchema,
      date: dateSchema,
      grams: gramsSchema,
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: "invalid" as const };
  }

  const food = await loadFoodById(parsed.data.foodId);
  if (!food) {
    return { error: "save" as const };
  }

  const nutrients = per100Of(food);
  const supabase = await createClient();
  const { error } = await supabase.from("food_log_entries").insert({
    user_id: user.id,
    log_date: parsed.data.date,
    meal: parsed.data.meal,
    food_id: food.id,
    quantity: 1,
    grams: parsed.data.grams,
    kcal_100: nutrients.kcal,
    protein_100: nutrients.proteinG,
    carbs_100: nutrients.carbsG,
    fat_100: nutrients.fatG,
    fiber_100: nutrients.fiberG,
    sugar_100: nutrients.sugarG,
    salt_100: nutrients.saltG,
    alcohol_100: nutrients.alcoholG,
  });
  if (error) {
    return { error: "save" as const };
  }

  return dayOrSave(user.id, parsed.data.date);
}

export async function logQuick(
  input: {
    meal: Meal;
    date: string;
    label: string;
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  },
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  if (!user) {
    return { error: "save" as const };
  }

  const parsed = z
    .object({
      meal: mealSchema,
      date: dateSchema,
      label: z.string().trim().min(1).max(80),
      kcal: z.number().min(0).max(20000),
      proteinG: z.number().min(0).max(2000),
      carbsG: z.number().min(0).max(2000),
      fatG: z.number().min(0).max(2000),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: "invalid" as const };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("quick_entries").insert({
    user_id: user.id,
    log_date: parsed.data.date,
    meal: parsed.data.meal,
    label: parsed.data.label,
    kcal: parsed.data.kcal,
    protein_g: parsed.data.proteinG,
    carbs_g: parsed.data.carbsG,
    fat_g: parsed.data.fatG,
  });
  if (error) {
    return { error: "save" as const };
  }

  return dayOrSave(user.id, parsed.data.date);
}

export async function updateEntryGrams(
  entryId: string,
  grams: number,
  date: string,
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  if (!user || !isIsoDate(date) || !gramsSchema.safeParse(grams).success) {
    return { error: "invalid" as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("food_log_entries")
    .update({ grams, quantity: 1, serving_id: null })
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (error) {
    return { error: "save" as const };
  }

  return dayOrSave(user.id, date);
}

const restorableSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("food"),
    meal: mealSchema,
    foodId: z.string(),
    grams: gramsSchema,
    quantity: z.number().positive(),
    kcal100: z.number().min(0),
    protein100: z.number().min(0),
    carbs100: z.number().min(0),
    fat100: z.number().min(0),
    fiber100: z.number().min(0).nullable(),
    sugar100: z.number().min(0).nullable(),
    salt100: z.number().min(0).nullable(),
    alcohol100: z.number().min(0).nullable(),
  }),
  z.object({
    kind: z.literal("quick"),
    meal: mealSchema,
    label: z.string().min(1).max(80),
    kcal: z.number().min(0),
    proteinG: z.number().min(0),
    carbsG: z.number().min(0),
    fatG: z.number().min(0),
  }),
]);

export async function deleteEntry(
  entryId: string,
  kind: "food" | "quick",
  date: string,
  locale: AppLocale,
): Promise<{ day: FoodDay; removed: Restorable } | { error: "save" | "invalid" }> {
  const user = await requireUser(locale);
  if (!user || !isIsoDate(date)) {
    return { error: "invalid" };
  }

  const supabase = await createClient();
  if (kind === "food") {
    const existing = await supabase
      .from("food_log_entries")
      .select(
        "meal, food_id, grams, quantity, kcal_100, protein_100, carbs_100, fat_100, fiber_100, sugar_100, salt_100, alcohol_100",
      )
      .eq("id", entryId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing.error || !existing.data) {
      return { error: "save" };
    }
    const row = z
      .object({
        meal: mealSchema,
        food_id: z.string(),
        grams: z.union([z.number(), z.string()]).transform(Number),
        quantity: z.union([z.number(), z.string()]).transform(Number),
        kcal_100: z.union([z.number(), z.string()]).transform(Number),
        protein_100: z.union([z.number(), z.string()]).transform(Number),
        carbs_100: z.union([z.number(), z.string()]).transform(Number),
        fat_100: z.union([z.number(), z.string()]).transform(Number),
        fiber_100: z.union([z.number(), z.string(), z.null()]).transform((value) => (value == null ? null : Number(value))),
        sugar_100: z.union([z.number(), z.string(), z.null()]).transform((value) => (value == null ? null : Number(value))),
        salt_100: z.union([z.number(), z.string(), z.null()]).transform((value) => (value == null ? null : Number(value))),
        alcohol_100: z.union([z.number(), z.string(), z.null()]).transform((value) => (value == null ? null : Number(value))),
      })
      .parse(existing.data);
    const removed = await supabase
      .from("food_log_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);
    if (removed.error) {
      return { error: "save" };
    }
    const day = await dayOrSave(user.id, date);
    if ("error" in day) {
      return day;
    }
    return {
      day: day.day,
      removed: {
        kind: "food",
        meal: row.meal,
        foodId: row.food_id,
        grams: row.grams,
        quantity: row.quantity,
        kcal100: row.kcal_100,
        protein100: row.protein_100,
        carbs100: row.carbs_100,
        fat100: row.fat_100,
        fiber100: row.fiber_100,
        sugar100: row.sugar_100,
        salt100: row.salt_100,
        alcohol100: row.alcohol_100,
      },
    };
  }

  const existing = await supabase
    .from("quick_entries")
    .select("meal, label, kcal, protein_g, carbs_g, fat_g")
    .eq("id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error || !existing.data) {
    return { error: "save" };
  }
  const row = z
    .object({
      meal: mealSchema,
      label: z.string(),
      kcal: z.union([z.number(), z.string()]).transform(Number),
      protein_g: z.union([z.number(), z.string()]).transform(Number),
      carbs_g: z.union([z.number(), z.string()]).transform(Number),
      fat_g: z.union([z.number(), z.string()]).transform(Number),
    })
    .parse(existing.data);
  const removed = await supabase
    .from("quick_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);
  if (removed.error) {
    return { error: "save" };
  }
  const day = await dayOrSave(user.id, date);
  if ("error" in day) {
    return day;
  }
  return {
    day: day.day,
    removed: {
      kind: "quick",
      meal: row.meal,
      label: row.label,
      kcal: row.kcal,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
    },
  };
}

export async function restoreEntry(
  date: string,
  removed: Restorable,
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  if (!user || !isIsoDate(date)) {
    return { error: "invalid" as const };
  }
  const parsed = restorableSchema.safeParse(removed);
  if (!parsed.success) {
    return { error: "invalid" as const };
  }

  const supabase = await createClient();
  if (parsed.data.kind === "food") {
    const { error } = await supabase.from("food_log_entries").insert({
      user_id: user.id,
      log_date: date,
      meal: parsed.data.meal,
      food_id: parsed.data.foodId,
      quantity: parsed.data.quantity,
      grams: parsed.data.grams,
      kcal_100: parsed.data.kcal100,
      protein_100: parsed.data.protein100,
      carbs_100: parsed.data.carbs100,
      fat_100: parsed.data.fat100,
      fiber_100: parsed.data.fiber100,
      sugar_100: parsed.data.sugar100,
      salt_100: parsed.data.salt100,
      alcohol_100: parsed.data.alcohol100,
    });
    if (error) {
      return { error: "save" as const };
    }
  } else {
    const { error } = await supabase.from("quick_entries").insert({
      user_id: user.id,
      log_date: date,
      meal: parsed.data.meal,
      label: parsed.data.label,
      kcal: parsed.data.kcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
    });
    if (error) {
      return { error: "save" as const };
    }
  }

  return dayOrSave(user.id, date);
}

export async function copyMeal(date: string, meal: Meal, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user || !isIsoDate(date) || !mealSchema.safeParse(meal).success) {
    return { error: "invalid" as const };
  }

  const from = addCalendarDays(date, -1);
  const supabase = await createClient();
  const [foods, quick] = await Promise.all([
    supabase
      .from("food_log_entries")
      .select(
        "food_id, serving_id, quantity, grams, kcal_100, protein_100, carbs_100, fat_100, fiber_100, sugar_100, salt_100, alcohol_100",
      )
      .eq("user_id", user.id)
      .eq("log_date", from)
      .eq("meal", meal),
    supabase
      .from("quick_entries")
      .select("label, kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .eq("log_date", from)
      .eq("meal", meal),
  ]);
  if (foods.error || quick.error) {
    return { error: "save" as const };
  }

  const foodRows = foods.data ?? [];
  const quickRows = quick.data ?? [];
  if (foodRows.length === 0 && quickRows.length === 0) {
    return { copied: 0 as const, day: await loadFoodDay(user.id, date) };
  }

  if (foodRows.length > 0) {
    const inserted = await supabase.from("food_log_entries").insert(
      foodRows.map((row) => ({
        user_id: user.id,
        log_date: date,
        meal,
        ...row,
      })),
    );
    if (inserted.error) {
      return { error: "save" as const };
    }
  }
  if (quickRows.length > 0) {
    const inserted = await supabase.from("quick_entries").insert(
      quickRows.map((row) => ({
        user_id: user.id,
        log_date: date,
        meal,
        ...row,
      })),
    );
    if (inserted.error) {
      return { error: "save" as const };
    }
  }

  const day = await dayOrSave(user.id, date);
  if ("error" in day) {
    return day;
  }
  return { copied: foodRows.length + quickRows.length, day: day.day };
}

export async function saveMeal(
  date: string,
  meal: Meal,
  name: string,
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  const label = name.trim();
  if (
    !user ||
    !isIsoDate(date) ||
    !mealSchema.safeParse(meal).success ||
    label.length === 0 ||
    label.length > 80
  ) {
    return { error: "invalid" as const };
  }

  const supabase = await createClient();
  const entries = await supabase
    .from("food_log_entries")
    .select("food_id, serving_id, quantity, grams")
    .eq("user_id", user.id)
    .eq("log_date", date)
    .eq("meal", meal);
  if (entries.error || !entries.data || entries.data.length === 0) {
    return { error: "empty" as const };
  }

  const created = await supabase
    .from("saved_meals")
    .insert({ user_id: user.id, name: label })
    .select("id")
    .single();
  if (created.error || !created.data) {
    return { error: "save" as const };
  }

  const items = await supabase.from("saved_meal_items").insert(
    entries.data.map((row, index) => ({
      saved_meal_id: created.data.id,
      food_id: row.food_id,
      serving_id: row.serving_id,
      quantity: row.quantity,
      grams: row.grams,
      sort_order: index,
    })),
  );
  if (items.error) {
    return { error: "save" as const };
  }

  return { error: null };
}

export async function logSavedMeal(
  savedMealId: string,
  meal: Meal,
  date: string,
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  if (!user || !isIsoDate(date) || !mealSchema.safeParse(meal).success) {
    return { error: "invalid" as const };
  }

  const supabase = await createClient();
  const items = await supabase
    .from("saved_meal_items")
    .select("food_id, quantity, grams, sort_order")
    .eq("saved_meal_id", savedMealId)
    .order("sort_order", { ascending: true });
  if (items.error || !items.data || items.data.length === 0) {
    return { error: "save" as const };
  }

  const owned = await supabase
    .from("saved_meals")
    .select("id")
    .eq("id", savedMealId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (owned.error || !owned.data) {
    return { error: "save" as const };
  }

  const rows = [];
  for (const item of items.data) {
    const food = await loadFoodById(item.food_id);
    if (!food) {
      continue;
    }
    const grams = z.union([z.number(), z.string()]).transform(Number).parse(item.grams);
    const quantity = z.union([z.number(), z.string()]).transform(Number).parse(item.quantity);
    rows.push({
      user_id: user.id,
      log_date: date,
      meal,
      food_id: food.id,
      quantity,
      grams,
      kcal_100: food.kcal,
      protein_100: food.proteinG,
      carbs_100: food.carbsG,
      fat_100: food.fatG,
      fiber_100: food.fiberG,
      sugar_100: food.sugarG,
      salt_100: food.saltG,
      alcohol_100: food.alcoholG,
    });
  }
  if (rows.length === 0) {
    return { error: "save" as const };
  }

  const inserted = await supabase.from("food_log_entries").insert(rows);
  if (inserted.error) {
    return { error: "save" as const };
  }
  return dayOrSave(user.id, date);
}

export async function toggleFavorite(
  foodId: string,
  favorite: boolean,
  locale: AppLocale,
) {
  const user = await requireUser(locale);
  if (!user) {
    return { error: "save" as const };
  }
  const supabase = await createClient();
  const result = favorite
    ? await supabase
        .from("favorite_foods")
        .upsert(
          { user_id: user.id, food_id: foodId },
          { onConflict: "user_id,food_id" },
        )
    : await supabase
        .from("favorite_foods")
        .delete()
        .eq("user_id", user.id)
        .eq("food_id", foodId);
  return { error: result.error ? ("save" as const) : null };
}

const userFoodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kcal: z.number().min(0).max(2000),
  proteinG: z.number().min(0).max(200),
  carbsG: z.number().min(0).max(200),
  fatG: z.number().min(0).max(200),
  fiberG: z.number().min(0).max(200).nullable(),
  sugarG: z.number().min(0).max(200).nullable(),
  saltG: z.number().min(0).max(200).nullable(),
  alcoholG: z.number().min(0).max(200).nullable(),
  acknowledge: z.boolean(),
});

export async function createUserFood(
  input: unknown,
  locale: AppLocale,
): Promise<
  | { food: FoodHit }
  | { error: "invalid" | "save" }
  | { error: "check" }
> {
  const user = await requireUser(locale);
  if (!user) {
    return { error: "save" };
  }
  const parsed = userFoodSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid" };
  }

  const disagrees = nutritionDisagrees(parsed.data.kcal, parsed.data);
  if (disagrees && !parsed.data.acknowledge) {
    return { error: "check" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      source: "user",
      owner_user_id: user.id,
      name_sv: parsed.data.name,
      kcal: parsed.data.kcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
      fiber_g: parsed.data.fiberG,
      sugar_g: parsed.data.sugarG,
      salt_g: parsed.data.saltG,
      alcohol_g: parsed.data.alcoholG,
      is_verified: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: "save" };
  }

  const food = await loadFoodById(data.id);
  return food ? { food } : { error: "save" };
}

export async function openBarcode(barcode: string, locale: AppLocale) {
  const user = await requireUser(locale);
  if (!user) {
    return { error: "save" as const };
  }

  const product = await fetchOffBarcode(barcode.trim());
  if (!product) {
    return { error: "missing" as const };
  }

  const warning = nutritionDisagrees(product.per100.kcal, product.per100);
  const supabase = await createClient();
  const cached = await supabase.rpc("cache_open_food", {
    p_source_id: product.code,
    p_name_sv: product.nameSv,
    p_name_en: product.nameEn ?? "",
    p_brand: product.brand ?? "",
    p_barcode: product.code,
    p_kcal: product.per100.kcal,
    p_protein_g: product.per100.proteinG,
    p_carbs_g: product.per100.carbsG,
    p_fat_g: product.per100.fatG,
    p_fiber_g: product.per100.fiberG,
    p_sugar_g: product.per100.sugarG,
    p_salt_g: product.per100.saltG,
    p_alcohol_g: product.per100.alcoholG,
  });
  if (cached.error || typeof cached.data !== "string") {
    return {
      error: "catalog" as const,
      draft: {
        name: product.nameSv,
        kcal: product.per100.kcal,
        proteinG: product.per100.proteinG,
        carbsG: product.per100.carbsG,
        fatG: product.per100.fatG,
        fiberG: product.per100.fiberG,
        sugarG: product.per100.sugarG,
        saltG: product.per100.saltG,
        alcoholG: product.per100.alcoholG,
      },
    };
  }

  const food = await loadFoodById(cached.data);
  if (!food) {
    return { error: "save" as const };
  }
  return { food, warning };
}
