import { describe, expect, it } from "vitest";
import { parseOffProduct, soldInSweden, swedishProductSearchUrl } from "./off";

describe("Open Food Facts products", () => {
  it("reads per-100 g values and prefers the Swedish name", () => {
    const product = parseOffProduct({
      code: "7310865004703",
      product_name: "SmartKök Testprodukt",
      product_name_sv: "SmartKök Testprodukt",
      brands: "Arla, Arla Foods",
      nutriments: {
        "energy-kcal_100g": 100,
        "energy-kj_100g": 550,
        proteins_100g: 3.1,
        carbohydrates_100g: 3.4,
        fat_100g: 12,
        sugars_100g: 3.4,
        salt_100g: 0.1,
      },
    });

    expect(product).toMatchObject({
      code: "7310865004703",
      brand: "Arla",
      per100: {
        kcal: 100,
        proteinG: 3.1,
        carbsG: 3.4,
        fatG: 12,
        sugarG: 3.4,
        saltG: 0.1,
        fiberG: null,
        alcoholG: null,
      },
    });
  });

  it("converts kJ when kcal is missing and rejects incomplete products", () => {
    expect(
      parseOffProduct({
        code: "1",
        product_name: "Test",
        nutriments: {
          "energy-kj_100g": 418.4,
          proteins_100g: 1,
          carbohydrates_100g: 1,
          fat_100g: 1,
        },
      })?.per100.kcal,
    ).toBeCloseTo(100, 8);

    expect(
      parseOffProduct({
        code: "1",
        product_name: "Test",
        nutriments: { "energy-kcal_100g": 100, fat_100g: 1 },
      }),
    ).toBeNull();
  });

  it("keeps packaged search on products sold in Sweden", () => {
    expect(soldInSweden(["en:denmark", "en:sweden"])).toBe(true);
    expect(soldInSweden(["en:france"])).toBe(false);
    expect(soldInSweden(undefined)).toBe(false);

    const url = swedishProductSearchUrl("kvarg");
    expect(url).toContain("https://se.openfoodfacts.org/cgi/search.pl?");
    expect(url).toContain("search_terms=kvarg");
    expect(swedishProductSearchUrl(" ")).toBeNull();
  });
});
