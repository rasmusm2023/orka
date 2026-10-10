import type { Meal } from "@/lib/nutrition/meals";

export type FoodSource = "livsmedelsverket" | "openfoodfacts" | "user";

export type FoodHit = {
  id: string;
  nameSv: string;
  nameEn: string | null;
  brand: string | null;
  barcode: string | null;
  source: FoodSource;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sugarG: number | null;
  saltG: number | null;
  alcoholG: number | null;
  isVerified: boolean;
};

export type FoodEntry = {
  id: string;
  kind: "food" | "quick";
  meal: Meal;
  name: string;
  grams: number | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  foodId: string | null;
};

export type FoodDay = {
  date: string;
  entries: FoodEntry[];
};

export type ServingOption = {
  id: string;
  labelSv: string;
  labelEn: string | null;
  grams: number;
};

export type SavedMealSummary = {
  id: string;
  name: string;
};

export type FoodSuggestions = {
  recent: FoodHit[];
  favorites: FoodHit[];
  savedMeals: SavedMealSummary[];
};

export type RestorableFood = {
  kind: "food";
  meal: Meal;
  foodId: string;
  grams: number;
  quantity: number;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number | null;
  sugar100: number | null;
  salt100: number | null;
  alcohol100: number | null;
};

export type RestorableQuick = {
  kind: "quick";
  meal: Meal;
  label: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type Restorable = RestorableFood | RestorableQuick;
