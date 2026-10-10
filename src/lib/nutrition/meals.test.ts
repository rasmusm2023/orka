import { describe, expect, it } from "vitest";
import { hourInTimeZone, mealForHour } from "./meals";

describe("meal from the hour", () => {
  it("maps the day onto breakfast, lunch, dinner and snacks", () => {
    expect(mealForHour(8)).toBe("frukost");
    expect(mealForHour(12)).toBe("lunch");
    expect(mealForHour(15)).toBe("mellanmal");
    expect(mealForHour(18)).toBe("middag");
    expect(mealForHour(23)).toBe("mellanmal");
    expect(mealForHour(0)).toBe("mellanmal");
  });

  it("reads the hour in Europe/Stockholm, including summer time", () => {
    expect(
      hourInTimeZone("Europe/Stockholm", new Date("2026-10-10T06:30:00.000Z")),
    ).toBe(8);
    expect(
      hourInTimeZone("Europe/Stockholm", new Date("2026-01-10T22:30:00.000Z")),
    ).toBe(23);
  });
});
