import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "@/i18n/locale";
import { getCurrentUser } from "@/lib/account/current-user";
import { DatabaseSetup } from "@/components/account/database-setup";
import { QueryProvider } from "@/components/food/query-provider";
import { AppShell } from "@/components/shell/app-shell";

export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="bg-track rounded-control mx-auto mt-8 h-8 w-32 motion-safe:animate-pulse" />
      }
    >
      <AuthenticatedApp>{children}</AuthenticatedApp>
    </Suspense>
  );
}

async function AuthenticatedApp({ children }: { children: ReactNode }) {
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

  if (!user.profile.onboardingCompletedAt) {
    redirect({ href: "/onboarding", locale });
  }

  return (
    <QueryProvider>
      <AppShell theme={user.profile.theme}>{children}</AppShell>
    </QueryProvider>
  );
}
