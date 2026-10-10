export type Per100 = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  sugarG?: number | null;
  saltG?: number | null;
  alcoholG?: number | null;
};

export type MacroTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

function scale(grams: number, per100: number): number {
  return (grams / 100) * per100;
}

export function totalsFromGrams(grams: number, per100: Per100) {
  return {
    kcal: scale(grams, per100.kcal),
    proteinG: scale(grams, per100.proteinG),
    carbsG: scale(grams, per100.carbsG),
    fatG: scale(grams, per100.fatG),
    fiberG: per100.fiberG == null ? null : scale(grams, per100.fiberG),
    sugarG: per100.sugarG == null ? null : scale(grams, per100.sugarG),
    saltG: per100.saltG == null ? null : scale(grams, per100.saltG),
    alcoholG:
      per100.alcoholG == null ? null : scale(grams, per100.alcoholG),
  };
}

export function sumTotals(entries: MacroTotals[]): MacroTotals {
  return entries.reduce(
    (sum, entry) => ({
      kcal: sum.kcal + entry.kcal,
      proteinG: sum.proteinG + entry.proteinG,
      carbsG: sum.carbsG + entry.carbsG,
      fatG: sum.fatG + entry.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
