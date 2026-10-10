import { getTranslations } from "next-intl/server";
import { formattingLocale } from "@/i18n/formatting";
import { getLocale } from "@/i18n/locale";
import { signOut } from "@/lib/account/actions";
import { getCurrentUser } from "@/lib/account/current-user";
import { listGoals, todayForTimezone } from "@/lib/account/records";
import { goalForDate } from "@/lib/goals/lookup";
import { formatDay, formatGrams, formatKcal } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { ListRow } from "@/components/ui/list-row";
import { LanguagePicker, ThemePicker } from "@/components/settings/preferences";

export const instant = false;

export default async function SettingsPage() {
  const locale = await getLocale();
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    return null;
  }

  const goals = await listGoals(result.user.id);
  const today = await todayForTimezone(result.user.profile.timezone);
  const current = goalForDate(goals, today);
  const history = goals
    .filter((goal) => goal !== current)
    .sort((left, right) => (left.effectiveFrom < right.effectiveFrom ? 1 : -1));
  const t = await getTranslations("Settings");
  const goalType = await getTranslations("Onboarding");
  const formatLocale = formattingLocale(locale);
  const typeLabel = {
    cut: goalType("cut"),
    maintain: goalType("maintain"),
    bulk: goalType("bulk"),
  };

  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <section className="mt-8">
        <h2 className="text-ink text-sm font-medium">{t("theme")}</h2>
        <div className="mt-3">
          <ThemePicker theme={result.user.profile.theme} />
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-ink text-sm font-medium">{t("language")}</h2>
        <div className="mt-3">
          <LanguagePicker />
        </div>
      </section>
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-ink text-sm font-medium">{t("goals")}</h2>
          <LinkButton href="/mal" variant="secondary">
            {t("changeGoal")}
          </LinkButton>
        </div>
        {current ? (
          <div className="mt-3">
            <ListRow
              title={typeLabel[current.goalType]}
              detail={t("from", {
                date: formatDay(current.effectiveFrom, formatLocale),
              })}
              value={t("goalLine", {
                kcal: formatKcal(current.kcal, formatLocale),
                protein: formatGrams(current.proteinG, formatLocale),
              })}
            />
          </div>
        ) : (
          <p className="text-muted mt-3 text-base">{t("noGoal")}</p>
        )}
        {history.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-muted text-sm font-medium">{t("history")}</h3>
            <div className="mt-2">
              {history.map((goal) => (
                <ListRow
                  key={`${goal.effectiveFrom}-${goal.createdAt}`}
                  title={typeLabel[goal.goalType]}
                  detail={t("from", {
                    date: formatDay(goal.effectiveFrom, formatLocale),
                  })}
                  value={t("goalLine", {
                    kcal: formatKcal(goal.kcal, formatLocale),
                    protein: formatGrams(goal.proteinG, formatLocale),
                  })}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <section className="mt-8">
        <LinkButton href="/om" variant="secondary">
          {t("about")}
        </LinkButton>
      </section>
      <form action={signOut.bind(null, locale)} className="mt-10">
        <Button type="submit" variant="ghost">
          {t("signOut")}
        </Button>
      </form>
    </div>
  );
}
