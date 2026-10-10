import { z } from "zod";
import { kcalFromKj } from "./energy";
import type { Per100 } from "./entry";

const nutrientRowSchema = z.object({
  euroFIRkod: z.string().nullable(),
  enhet: z.string().nullable(),
  varde: z.number(),
  viktGram: z.number(),
  matrisenhetkod: z.string().nullable(),
});

export const nutrientListSchema = z.array(nutrientRowSchema);

export const livsmedelSchema = z.object({
  nummer: z.number().int(),
  namn: z.string().nullable(),
  version: z.string().nullable().optional(),
});

export const livsmedelPageSchema = z.object({
  _meta: z.object({
    totalRecords: z.number().int(),
    count: z.number().int(),
  }),
  livsmedel: z.array(livsmedelSchema).nullable(),
});

type NutrientRow = z.infer<typeof nutrientRowSchema>;

function unit(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function pick(
  rows: NutrientRow[],
  code: string,
  expectedUnit?: string,
): number | undefined {
  const found = rows.find((row) => {
    if (row.euroFIRkod !== code || row.matrisenhetkod !== "W") {
      return false;
    }
    if (row.viktGram !== 100 || !Number.isFinite(row.varde)) {
      return false;
    }
    if (expectedUnit && unit(row.enhet) !== expectedUnit) {
      return false;
    }
    return true;
  });

  return found?.varde;
}

export function per100FromLivsmedel(rows: NutrientRow[]): Per100 | null {
  const kcalRow = pick(rows, "ENERC", "kcal");
  const kilojoules = pick(rows, "ENERC", "kj");
  const kcal = kcalRow ?? (kilojoules == null ? null : kcalFromKj(kilojoules));
  const proteinG = pick(rows, "PROT");
  const carbsG = pick(rows, "CHO");
  const fatG = pick(rows, "FAT");

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
    fiberG: pick(rows, "FIBT") ?? null,
    sugarG: pick(rows, "SUGAR") ?? null,
    saltG: pick(rows, "NACL") ?? null,
    alcoholG: pick(rows, "ALC") ?? null,
  };
}
