import { getTranslations } from "next-intl/server";
import { formattingLocale } from "@/i18n/formatting";
import { getLocale } from "@/i18n/locale";
import { getCurrentUser } from "@/lib/account/current-user";
import {
  goalOnDate,
  loggedDates,
  todayForTimezone,
  weightOnDate,
} from "@/lib/account/records";
import { resolveSelectedDate, weekDates } from "@/lib/dates/calendar";
import { loadFoodDay } from "@/lib/food/load";
import { formatGrams, formatKcal } from "@/lib/format";
import { sumTotals } from "@/lib/nutrition/entry";
import { meals } from "@/lib/nutrition/meals";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { ListRow } from "@/components/ui/list-row";
import { MacroBars } from "@/components/ui/macro-bars";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DateSwitcher } from "@/components/shell/date-switcher";

export const instant = false;

export default async function TodayPage({
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
  const [goal, weight, logged, food] = await Promise.all([
    goalOnDate(result.user.id, selected),
    weightOnDate(result.user.id, selected),
    loggedDates(result.user.id, week[0], week[6]),
    loadFoodDay(result.user.id, selected),
  ]);
  const t = await getTranslations("Today");
  const foodText = await getTranslations("Food");
  const formatLocale = formattingLocale(locale);
  const totals = sumTotals(food.entries);
  const eaten = totals.kcal;
  const matHref = selected === today ? "/mat" : `/mat?datum=${selected}`;

  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <DateSwitcher
        pathname="/"
        selected={selected}
        today={today}
        logged={logged}
        locale={locale}
      />
      <div className="mt-8 flex flex-col gap-4">
        {goal ? (
          <Card>
            <ProgressRing
              ratio={goal.kcal > 0 ? eaten / goal.kcal : 0}
              value={formatKcal(
                eaten > goal.kcal ? eaten - goal.kcal : goal.kcal - eaten,
                formatLocale,
              )}
              unit={t("kcal")}
              label={eaten > goal.kcal ? t("over") : t("remaining")}
            />
            <p className="text-muted mt-2 text-center text-sm">
              {t("eatenLine", { kcal: formatKcal(eaten, formatLocale) })}
            </p>
            <div className="mt-6">
              <MacroBars
                items={[
                  {
                    label: t("protein"),
                    value: t("macroValue", {
                      eaten: formatGrams(totals.proteinG, formatLocale),
                      target: formatGrams(goal.proteinG, formatLocale),
                    }),
                    ratio: goal.proteinG > 0 ? totals.proteinG / goal.proteinG : 0,
                    prominent: true,
                  },
                  {
                    label: t("carbs"),
                    value: t("macroValue", {
                      eaten: formatGrams(totals.carbsG, formatLocale),
                      target: formatGrams(goal.carbsG, formatLocale),
                    }),
                    ratio: goal.carbsG > 0 ? totals.carbsG / goal.carbsG : 0,
                  },
                  {
                    label: t("fat"),
                    value: t("macroValue", {
                      eaten: formatGrams(totals.fatG, formatLocale),
                      target: formatGrams(goal.fatG, formatLocale),
                    }),
                    ratio: goal.fatG > 0 ? totals.fatG / goal.fatG : 0,
                  },
                ]}
              />
            </div>
          </Card>
        ) : (
          <EmptyState
            title={t("noGoalTitle")}
            body={t("noGoalBody")}
            action={<LinkButton href="/mal">{t("noGoalAction")}</LinkButton>}
          />
        )}
        <Card title={t("mealsTitle")}>
          {food.entries.length === 0 ? (
            <EmptyState
              title={t("mealsEmptyTitle")}
              body={t("mealsEmptyBody")}
              action={<LinkButton href={matHref}>{t("mealsAction")}</LinkButton>}
            />
          ) : (
            <div>
              {meals.map((meal) => {
                const rows = food.entries.filter((entry) => entry.meal === meal);
                if (rows.length === 0) {
                  return null;
                }
                const mealTotal = sumTotals(rows);
                return (
                  <details key={meal} className="border-line border-b py-2 last:border-b-0">
                    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
                      <span>{foodText(`meals.${meal}`)}</span>
                      <span className="font-display text-2xl leading-none font-semibold tabular-nums">
                        {foodText("mealKcal", {
                          kcal: formatKcal(mealTotal.kcal, formatLocale),
                        })}
                      </span>
                    </summary>
                    {rows.map((entry) => (
                      <p
                        key={entry.id}
                        className="text-muted flex justify-between gap-3 py-1 text-sm"
                      >
                        <span className="truncate">{entry.name}</span>
                        <span className="tabular-nums">
                          {formatKcal(entry.kcal, formatLocale)}
                        </span>
                      </p>
                    ))}
                  </details>
                );
              })}
              <div className="mt-4">
                <LinkButton href={matHref} variant="secondary">
                  {t("mealsAction")}
                </LinkButton>
              </div>
            </div>
          )}
        </Card>
        <Card title={t("workoutTitle")}>
          <EmptyState
            title={t("workoutEmptyTitle")}
            body={t("workoutEmptyBody")}
            action={
              <LinkButton href="/traning">{t("workoutAction")}</LinkButton>
            }
          />
        </Card>
        <Card title={t("weightTitle")}>
          {weight == null ? (
            <EmptyState
              title={t("weightEmptyTitle")}
              body={t("weightEmptyBody")}
            />
          ) : (
            <ListRow
              title={t("weightTitle")}
              value={`${formatGrams(weight, formatLocale)} ${t("kg")}`}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
