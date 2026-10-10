import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formattingLocale } from "@/i18n/formatting";
import type { AppLocale } from "@/i18n/routing";
import { addCalendarDays, weekDates } from "@/lib/dates/calendar";
import { dayOfMonth, formatDay, formatWeekday } from "@/lib/format";
import { focusRing } from "@/components/ui/focus";

type DateSwitcherProps = {
  pathname: "/" | "/mat";
  selected: string;
  today: string;
  logged: string[];
  locale: AppLocale;
};

function dayHref(pathname: "/" | "/mat", day: string, today: string) {
  if (day === today) {
    return pathname;
  }

  return { pathname, query: { datum: day } };
}

export async function DateSwitcher({
  pathname,
  selected,
  today,
  logged,
  locale,
}: DateSwitcherProps) {
  const t = await getTranslations("Shell");
  const formatLocale = formattingLocale(locale);
  const loggedDays = new Set(logged);
  const days = weekDates(selected);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={dayHref(pathname, addCalendarDays(selected, -1), today)}
          aria-label={t("previousDay")}
          className={`rounded-control inline-flex size-11 items-center justify-center text-2xl ${focusRing}`}
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="font-display text-3xl leading-none font-semibold tracking-tight">
            {formatDay(selected, formatLocale)}
          </p>
          {selected === today ? null : (
            <Link
              href={pathname}
              className={`text-muted mt-1 inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline ${focusRing}`}
            >
              {t("today")}
            </Link>
          )}
        </div>
        <Link
          href={dayHref(pathname, addCalendarDays(selected, 1), today)}
          aria-label={t("nextDay")}
          className={`rounded-control inline-flex size-11 items-center justify-center text-2xl ${focusRing}`}
        >
          ›
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selectedDay = day === selected;
          const hasLog = loggedDays.has(day);
          const label = formatDay(day, formatLocale);
          return (
            <Link
              key={day}
              href={dayHref(pathname, day, today)}
              aria-current={selectedDay ? "date" : undefined}
              aria-label={hasLog ? `${label}, ${t("logged")}` : label}
              className={`rounded-control flex min-h-14 flex-col items-center justify-center text-center ${
                selectedDay
                  ? "bg-ink text-background"
                  : "text-ink hover:bg-track"
              } ${focusRing}`}
            >
              <span
                className={`text-xs ${selectedDay ? "text-background/80" : "text-muted"}`}
              >
                {formatWeekday(day, formatLocale)}
              </span>
              <span className="font-display text-lg leading-none font-semibold tabular-nums">
                {dayOfMonth(day)}
              </span>
              <span
                className={`mt-1 size-1.5 rounded-full ${hasLog ? "bg-food" : "bg-transparent"} ${selectedDay && hasLog ? "bg-background" : ""}`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
