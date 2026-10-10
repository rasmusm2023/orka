import { getTranslations } from "next-intl/server";
import { formattingLocale } from "@/i18n/formatting";
import { getLocale } from "@/i18n/locale";
import { getCurrentUser } from "@/lib/account/current-user";
import {
  goalOnDate,
  latestWeight,
  todayForTimezone,
} from "@/lib/account/records";
import { GoalWizard } from "@/components/goals/goal-wizard";

export const instant = false;

export default async function EditGoalPage() {
  const locale = await getLocale();
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    return null;
  }

  const today = await todayForTimezone(result.user.profile.timezone);
  const [goal, weight] = await Promise.all([
    goalOnDate(result.user.id, today),
    latestWeight(result.user.id),
  ]);
  const t = await getTranslations("Onboarding");

  return (
    <div>
      <p className="text-muted text-sm font-medium">{t("editTitle")}</p>
      <div className="mt-4">
        <GoalWizard
          mode="edit"
          formatting={formattingLocale(locale)}
          today={today}
          initial={{
            sex: result.user.profile.sex,
            birthDate: result.user.profile.birthDate,
            heightCm: result.user.profile.heightCm,
            weightKg: weight,
            activityLevel: result.user.profile.activityLevel,
            goalType: goal?.goalType ?? null,
            kcal: goal?.kcal ?? null,
            proteinG: goal?.proteinG ?? null,
            carbsG: goal?.carbsG ?? null,
            fatG: goal?.fatG ?? null,
          }}
        />
      </div>
    </div>
  );
}
