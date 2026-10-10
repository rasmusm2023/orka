const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = isoDate.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function calendarDateInTimeZone(
  timeZone: string,
  instant: Date,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format a calendar date for ${timeZone}.`);
  }

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(isoDateValue: string, days: number): string {
  if (!isIsoDate(isoDateValue) || !Number.isInteger(days)) {
    throw new Error(
      "A calendar shift needs an ISO date and a whole number of days.",
    );
  }

  const [year, month, day] = isoDateValue.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return shifted.toISOString().slice(0, 10);
}

export function mondayOfWeek(isoDateValue: string): string {
  if (!isIsoDate(isoDateValue)) {
    throw new Error("A week needs an ISO date.");
  }

  const [year, month, day] = isoDateValue.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;

  return addCalendarDays(isoDateValue, -daysFromMonday);
}

export function weekDates(isoDateValue: string): string[] {
  const monday = mondayOfWeek(isoDateValue);
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(monday, index),
  );
}

export function resolveSelectedDate(
  requested: string | undefined,
  today: string,
): string {
  if (requested && isIsoDate(requested)) {
    return requested;
  }

  return today;
}
