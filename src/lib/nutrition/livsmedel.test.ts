import { describe, expect, it } from "vitest";
import { per100FromLivsmedel } from "./livsmedel";

const edible = (
  code: string,
  enhet: string,
  varde: number,
  matrisenhetkod = "W",
) => ({
  euroFIRkod: code,
  enhet,
  varde,
  viktGram: 100,
  matrisenhetkod,
});

const notTalg = [
  edible("PROT", "g", 0),
  edible("CHO", "g", 0),
  edible("FAT", "g", 100),
  edible("FAT", "g", 999, "FA"),
  edible("ENERC", "kJ", 3700),
  edible("ENERC", "kcal", 884),
  edible("FIBT", "g", 0),
  edible("SUGAR", "g", 0),
  edible("NACL", "g", 0),
  edible("ALC", "g", 0),
];

describe("Livsmedelsverket nutrients", () => {
  it("uses the published kcal and ignores other matrix units", () => {
    expect(per100FromLivsmedel(notTalg)).toEqual({
      kcal: 884,
      proteinG: 0,
      carbsG: 0,
      fatG: 100,
      fiberG: 0,
      sugarG: 0,
      saltG: 0,
      alcoholG: 0,
    });
  });

  it("converts kJ only when kcal is missing", () => {
    const rows = notTalg.filter(
      (row) => !(row.euroFIRkod === "ENERC" && row.enhet === "kcal"),
    );
    expect(per100FromLivsmedel(rows)?.kcal).toBeCloseTo(3700 / 4.184, 10);
  });

  it("returns nothing when a required macro is missing", () => {
    expect(
      per100FromLivsmedel(notTalg.filter((row) => row.euroFIRkod !== "PROT")),
    ).toBeNull();
  });
});
