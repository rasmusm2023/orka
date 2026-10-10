import { z } from "zod";
import { meals } from "@/lib/nutrition/meals";
import type { FoodHit, FoodSource } from "./types";

const numeric = z.union([z.number(), z.string()]).transform(Number);
const nullableNumeric = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => (value == null ? null : Number(value)));

export const foodHitRow = z.object({
  id: z.string(),
  name_sv: z.string(),
  name_en: z.string().nullable(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  source: z.enum(["livsmedelsverket", "openfoodfacts", "user"]),
  kcal: numeric,
  protein_g: numeric,
  carbs_g: numeric,
  fat_g: numeric,
  fiber_g: nullableNumeric,
  sugar_g: nullableNumeric,
  salt_g: nullableNumeric,
  alcohol_g: nullableNumeric,
  is_verified: z.boolean(),
});

export function toFoodHit(row: z.infer<typeof foodHitRow>): FoodHit {
  return {
    id: row.id,
    nameSv: row.name_sv,
    nameEn: row.name_en,
    brand: row.brand,
    barcode: row.barcode,
    source: row.source satisfies FoodSource,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    fiberG: row.fiber_g,
    sugarG: row.sugar_g,
    saltG: row.salt_g,
    alcoholG: row.alcohol_g,
    isVerified: row.is_verified,
  };
}

export const foodColumns =
  "id, name_sv, name_en, brand, barcode, source, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, salt_g, alcohol_g, is_verified";

export { meals };
