import { getTranslations } from "next-intl/server";
import { formattingLocale } from "@/i18n/formatting";
import { getLocale } from "@/i18n/locale";
import { getCurrentUser } from "@/lib/account/current-user";
import { loggedDates, todayForTimezone } from "@/lib/account/records";
import { resolveSelectedDate, weekDates } from "@/lib/dates/calendar";
import { loadFoodDay } from "@/lib/food/load";
import { DateSwitcher } from "@/components/shell/date-switcher";
import { FoodDayView } from "@/components/food/food-day";

export const instant = false;

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    return null;
  }

  const params = await searchParams;
  const requested = typeof params.datum === "string" ? params.datum : undefined;
  const today = await todayForTimezone(result.user.profile.timezone);
  const selected = resolveSelectedDate(requested, today);
  const week = weekDates(selected);
  const [logged, day] = await Promise.all([
    loggedDates(result.user.id, week[0], week[6]),
    loadFoodDay(result.user.id, selected),
  ]);
  const t = await getTranslations("Food");

  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <DateSwitcher
        pathname="/mat"
        selected={selected}
        today={today}
        logged={logged}
        locale={locale}
      />
      <FoodDayView
        day={day}
        timeZone={result.user.profile.timezone}
        formatting={formattingLocale(locale)}
      />
    </div>
  );
}
