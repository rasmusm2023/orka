import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDateInTimeZone,
  isIsoDate,
  mondayOfWeek,
  resolveSelectedDate,
  weekDates,
} from "./calendar";

describe("calendar dates in Europe/Stockholm", () => {
  it("uses the local date just after midnight during summer time", () => {
    const instant = new Date("2026-10-10T22:30:00.000Z");
    expect(calendarDateInTimeZone("Europe/Stockholm", instant)).toBe(
      "2026-10-11",
    );
  });

  it("keeps the previous local date before midnight during summer time", () => {
    const instant = new Date("2026-10-10T21:30:00.000Z");
    expect(calendarDateInTimeZone("Europe/Stockholm", instant)).toBe(
      "2026-10-10",
    );
  });

  it("uses the local date just after midnight during standard time", () => {
    const instant = new Date("2026-01-10T23:30:00.000Z");
    expect(calendarDateInTimeZone("Europe/Stockholm", instant)).toBe(
      "2026-01-11",
    );
  });

  it("keeps the previous local date before midnight during standard time", () => {
    const instant = new Date("2026-01-10T22:30:00.000Z");
    expect(calendarDateInTimeZone("Europe/Stockholm", instant)).toBe(
      "2026-01-10",
    );
  });

  it("follows the spring-forward transition without skipping a calendar day", () => {
    expect(
      calendarDateInTimeZone(
        "Europe/Stockholm",
        new Date("2026-03-28T23:30:00.000Z"),
      ),
    ).toBe("2026-03-29");
    expect(
      calendarDateInTimeZone(
        "Europe/Stockholm",
        new Date("2026-03-29T00:30:00.000Z"),
      ),
    ).toBe("2026-03-29");
    expect(
      calendarDateInTimeZone(
        "Europe/Stockholm",
        new Date("2026-03-29T01:30:00.000Z"),
      ),
    ).toBe("2026-03-29");
    expect(addCalendarDays("2026-03-28", 1)).toBe("2026-03-29");
  });

  it("follows the fall-back transition without repeating a calendar day", () => {
    expect(
      calendarDateInTimeZone(
        "Europe/Stockholm",
        new Date("2026-10-24T22:30:00.000Z"),
      ),
    ).toBe("2026-10-25");
    expect(
      calendarDateInTimeZone(
        "Europe/Stockholm",
        new Date("2026-10-25T00:30:00.000Z"),
      ),
    ).toBe("2026-10-25");
    expect(addCalendarDays("2026-10-24", 1)).toBe("2026-10-25");
  });
});

describe("weeks start on Monday", () => {
  it("finds the Monday of a Saturday", () => {
    expect(mondayOfWeek("2026-10-10")).toBe("2026-10-05");
  });

  it("keeps a Monday as the start of its own week", () => {
    expect(mondayOfWeek("2026-10-05")).toBe("2026-10-05");
  });

  it("puts Sunday at the end of the week", () => {
    expect(weekDates("2026-10-11")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });
});

describe("selected dates", () => {
  it("rejects dates that are not real calendar days", () => {
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-10-10")).toBe(true);
  });

  it("falls back to today when the requested date is missing or invalid", () => {
    expect(resolveSelectedDate(undefined, "2026-10-10")).toBe("2026-10-10");
    expect(resolveSelectedDate("nope", "2026-10-10")).toBe("2026-10-10");
    expect(resolveSelectedDate("2026-10-11", "2026-10-10")).toBe("2026-10-11");
  });
});
