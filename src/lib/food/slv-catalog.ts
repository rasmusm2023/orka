import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { rankCatalog, type CatalogName } from "@/lib/nutrition/catalog-rank";
import {
  nutrientListSchema,
  per100FromLivsmedel,
} from "@/lib/nutrition/livsmedel";
import type { Per100 } from "@/lib/nutrition/entry";
import type { FoodHit } from "./types";

const nameSchema = z.object({
  nummer: z.number().int(),
  nameSv: z.string(),
  nameEn: z.string().nullable(),
});

const nutrientCache = new Map<number, Per100 | null>();
let names: CatalogName[] | null = null;

function catalogNames(): CatalogName[] {
  if (!names) {
    const file = readFileSync(
      join(process.cwd(), "data", "livsmedel-names.json"),
      "utf8",
    );
    names = z.array(nameSchema).parse(JSON.parse(file));
  }
  return names;
}

export function catalogFood(nummer: number): CatalogName | null {
  return catalogNames().find((food) => food.nummer === nummer) ?? null;
}

export async function nutrientsFor(nummer: number): Promise<Per100 | null> {
  const cached = nutrientCache.get(nummer);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(
    `https://dataportal.livsmedelsverket.se/livsmedel/api/v1/livsmedel/${nummer}/naringsvarden?sprak=1`,
  );
  if (!response.ok) {
    nutrientCache.set(nummer, null);
    return null;
  }

  const nutrients = per100FromLivsmedel(
    nutrientListSchema.parse(await response.json()),
  );
  nutrientCache.set(nummer, nutrients);
  return nutrients;
}

export async function searchOfficialFoods(query: string): Promise<FoodHit[]> {
  const matches = rankCatalog(catalogNames(), query);
  const loaded = await Promise.all(
    matches.map(async (food) => {
      const per100 = await nutrientsFor(food.nummer);
      if (!per100) {
        return null;
      }
      const hit: FoodHit = {
        id: `slv:${food.nummer}`,
        nameSv: food.nameSv,
        nameEn: food.nameEn,
        brand: null,
        barcode: null,
        source: "livsmedelsverket",
        kcal: per100.kcal,
        proteinG: per100.proteinG,
        carbsG: per100.carbsG,
        fatG: per100.fatG,
        fiberG: per100.fiberG ?? null,
        sugarG: per100.sugarG ?? null,
        saltG: per100.saltG ?? null,
        alcoholG: per100.alcoholG ?? null,
        isVerified: true,
      };
      return hit;
    }),
  );

  const order = new Map(matches.map((food, index) => [food.nummer, index]));
  return loaded
    .flatMap((hit) => (hit ? [hit] : []))
    .sort(
      (left, right) =>
        (order.get(Number(left.id.slice(4))) ?? 0) -
        (order.get(Number(right.id.slice(4))) ?? 0),
    );
}
