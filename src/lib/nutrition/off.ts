import { z } from "zod";
import { kcalFromKj } from "./energy";
import type { Per100 } from "./entry";

const optionalNumber = z.number().nullish();

const nutrimentsSchema = z
  .object({
    "energy-kcal_100g": optionalNumber,
    "energy-kj_100g": optionalNumber,
    proteins_100g: optionalNumber,
    carbohydrates_100g: optionalNumber,
    fat_100g: optionalNumber,
    fiber_100g: optionalNumber,
    sugars_100g: optionalNumber,
    salt_100g: optionalNumber,
    alcohol_100g: optionalNumber,
  })
  .partial();

const productFields = {
  code: z.string().optional(),
  product_name: z.string().nullish(),
  product_name_sv: z.string().nullish(),
  product_name_en: z.string().nullish(),
  brands: z.string().nullish(),
  nutriments: nutrimentsSchema.optional(),
};

const searchProductFields = {
  ...productFields,
  countries_tags: z.array(z.string()).nullish(),
};

export const offProductSchema = z.object({
  status: z.number(),
  product: z.object(productFields).optional(),
});

export const offSearchSchema = z.object({
  products: z.array(z.object(searchProductFields)).optional(),
});

const swedenTag = "en:sweden";

export function soldInSweden(
  tags: readonly string[] | null | undefined,
): boolean {
  return (tags ?? []).some((tag) => tag.toLowerCase() === swedenTag);
}

export function swedishProductSearchUrl(query: string): string | null {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) {
    return null;
  }

  const url = new URL("https://se.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");
  url.searchParams.set(
    "fields",
    "code,product_name,product_name_sv,product_name_en,brands,nutriments,countries_tags",
  );
  return url.toString();
}

export type OffProduct = {
  code: string;
  nameSv: string;
  nameEn: string | null;
  brand: string | null;
  per100: Per100;
};

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function per100(
  nutriments: z.infer<typeof nutrimentsSchema> | undefined,
): Per100 | null {
  if (!nutriments) {
    return null;
  }

  const kcal =
    nutriments["energy-kcal_100g"] ??
    (nutriments["energy-kj_100g"] == null
      ? null
      : kcalFromKj(nutriments["energy-kj_100g"]));
  const proteinG = nutriments.proteins_100g;
  const carbsG = nutriments.carbohydrates_100g;
  const fatG = nutriments.fat_100g;

  if (
    kcal == null ||
    proteinG == null ||
    carbsG == null ||
    fatG == null ||
    kcal < 0 ||
    proteinG < 0 ||
    carbsG < 0 ||
    fatG < 0
  ) {
    return null;
  }

  return {
    kcal,
    proteinG,
    carbsG,
    fatG,
    fiberG: nutriments.fiber_100g ?? null,
    sugarG: nutriments.sugars_100g ?? null,
    saltG: nutriments.salt_100g ?? null,
    alcoholG: nutriments.alcohol_100g ?? null,
  };
}

type OffFields = {
  code?: string;
  product_name?: string | null;
  product_name_sv?: string | null;
  product_name_en?: string | null;
  brands?: string | null;
  nutriments?: z.infer<typeof nutrimentsSchema>;
};

export function parseOffProduct(input: OffFields): OffProduct | null {
  const code = text(input.code);
  const nameSv = text(input.product_name_sv) ?? text(input.product_name);
  const nutrients = per100(input.nutriments);
  if (!code || !nameSv || !nutrients) {
    return null;
  }

  return {
    code,
    nameSv,
    nameEn: text(input.product_name_en) ?? text(input.product_name),
    brand: text(input.brands)?.split(",")[0]?.trim() ?? null,
    per100: nutrients,
  };
}
