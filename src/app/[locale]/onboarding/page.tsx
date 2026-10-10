import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formattingLocale } from "@/i18n/formatting";
import { getLocale } from "@/i18n/locale";
import { signOut } from "@/lib/account/actions";
import { getCurrentUser } from "@/lib/account/current-user";
import { latestWeight, todayForTimezone } from "@/lib/account/records";
import { DatabaseSetup } from "@/components/account/database-setup";
import { GoalWizard } from "@/components/goals/goal-wizard";
import { Button } from "@/components/ui/button";

export const instant = false;

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-track rounded-control mx-auto mt-8 h-8 w-32 motion-safe:animate-pulse" />
      }
    >
      <Onboarding />
    </Suspense>
  );
}

async function Onboarding() {
  await connection();
  const locale = await getLocale();
  const result = await getCurrentUser();

  if (result.status === "schema") {
    return <DatabaseSetup />;
  }

  if (result.status === "signed-out") {
    redirect({ href: "/logga-in", locale });
  }

  const user = result.status === "ready" ? result.user : null;
  if (!user) {
    redirect({ href: "/logga-in", locale });
    return null;
  }

  if (user.profile.onboardingCompletedAt) {
    redirect({ href: "/", locale });
  }

  const today = await todayForTimezone(user.profile.timezone);
  const weight = await latestWeight(user.id);
  const shell = await getTranslations("Shell");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-8">
      <GoalWizard
        mode="onboarding"
        formatting={formattingLocale(locale)}
        today={today}
        initial={{
          sex: user.profile.sex,
          birthDate: user.profile.birthDate,
          heightCm: user.profile.heightCm,
          weightKg: weight,
          activityLevel: user.profile.activityLevel,
          goalType: null,
          kcal: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
        }}
      />
      <form action={signOut.bind(null, locale)} className="mt-6">
        <Button type="submit" variant="ghost">
          {shell("signOut")}
        </Button>
      </form>
    </main>
  );
}
