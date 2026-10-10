import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  livsmedelPageSchema,
  nutrientListSchema,
  per100FromLivsmedel,
} from "../src/lib/nutrition/livsmedel";

const base = "https://dataportal.livsmedelsverket.se/livsmedel";

function loadLocalEnv() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Livsmedelsverket answered ${response.status} for ${url}`);
  }
  return response.json();
}

async function listAll(language: 1 | 2) {
  const foods: Array<{ nummer: number; namn: string | null; version?: string | null }> = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const json = await getJson(
      `${base}/api/v1/livsmedel?offset=${offset}&limit=${limit}&sprak=${language}`,
    );
    const page = livsmedelPageSchema.parse(json);
    foods.push(...(page.livsmedel ?? []));
    if (
      foods.length >= page._meta.totalRecords ||
      (page.livsmedel ?? []).length === 0
    ) {
      break;
    }
    offset += limit;
  }

  return foods;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. The secret key is under Project Settings → API Keys.",
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const swedish = await listAll(1);
const english = await listAll(2);
const englishNames = new Map(
  english.flatMap((food) =>
    food.namn ? [[food.nummer, food.namn] as const] : [],
  ),
);

const rows = (
  await mapPool(swedish, 8, async (food) => {
    if (!food.namn) {
      return null;
    }
    const json = await getJson(
      `${base}/api/v1/livsmedel/${food.nummer}/naringsvarden?sprak=1`,
    );
    const nutrients = per100FromLivsmedel(nutrientListSchema.parse(json));
    if (!nutrients) {
      return null;
    }
    return {
      source: "livsmedelsverket",
      source_id: String(food.nummer),
      owner_user_id: null,
      name_sv: food.namn,
      name_en: englishNames.get(food.nummer) ?? null,
      kcal: nutrients.kcal,
      protein_g: nutrients.proteinG,
      carbs_g: nutrients.carbsG,
      fat_g: nutrients.fatG,
      fiber_g: nutrients.fiberG,
      sugar_g: nutrients.sugarG,
      salt_g: nutrients.saltG,
      alcohol_g: nutrients.alcoholG,
      is_verified: true,
      source_version: food.version ?? null,
      last_synced_at: new Date().toISOString(),
    };
  })
).flatMap((row) => (row ? [row] : []));

for (let index = 0; index < rows.length; index += 100) {
  const batch = rows.slice(index, index + 100);
  const { error } = await supabase.from("foods").upsert(batch, {
    onConflict: "source,source_id",
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Imported ${Math.min(index + batch.length, rows.length)} / ${rows.length}`);
}

console.log(
  `Done. Skipped ${swedish.length - rows.length} foods without a name or required nutrients.`,
);
