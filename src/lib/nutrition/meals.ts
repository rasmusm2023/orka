export const meals = ["frukost", "lunch", "middag", "mellanmal"] as const;

export type Meal = (typeof meals)[number];

export function mealForHour(hour: number): Meal {
  if (hour >= 5 && hour < 10) {
    return "frukost";
  }
  if (hour >= 10 && hour < 14) {
    return "lunch";
  }
  if (hour >= 17 && hour < 21) {
    return "middag";
  }

  return "mellanmal";
}

export function hourInTimeZone(timeZone: string, instant: Date): number {
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(instant)
    .find((part) => part.type === "hour")?.value;

  const hour = Number(value);
  return hour === 24 ? 0 : hour;
}
