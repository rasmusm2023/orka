import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rankCatalog } from "./catalog-rank";

const foods = [
  { nummer: 1, nameSv: "Nöt talg", nameEn: "Beef tallow" },
  { nummer: 2, nameSv: "Kvarg naturell", nameEn: "Quark, plain" },
  { nummer: 3, nameSv: "Kvarg vanilj", nameEn: "Quark, vanilla" },
  { nummer: 4, nameSv: "Ägg", nameEn: "Egg" },
  { nummer: 5, nameSv: "Äggröra", nameEn: "Scrambled egg" },
  { nummer: 6, nameSv: "Fromage blanc", nameEn: "Fromage blanc" },
];

describe("Livsmedelsverket name ranking", () => {
  it("puts the matching Swedish foods first", () => {
    expect(rankCatalog(foods, "kvarg").map((food) => food.nameSv)).toEqual([
      "Kvarg vanilj",
      "Kvarg naturell",
    ]);
  });

  it("prefers the shorter exact food over a longer dish", () => {
    expect(rankCatalog(foods, "ägg")[0]?.nameSv).toBe("Ägg");
  });

  it("does not return unrelated foods", () => {
    expect(rankCatalog(foods, "kvarg").map((food) => food.nameSv)).not.toContain(
      "Fromage blanc",
    );
  });

  it("uses the official food names", () => {
    const rows = JSON.parse(
      readFileSync("data/livsmedel-names.json", "utf8"),
    ) as Array<{ nummer: number; nameSv: string; nameEn: string | null }>;
    const top = rankCatalog(rows, "kvarg").map((food) => food.nameSv);

    expect(top.length).toBeGreaterThan(0);
    expect(top.every((name) => name.toLocaleLowerCase("sv-SE").includes("kvarg"))).toBe(
      true,
    );
  });
});
