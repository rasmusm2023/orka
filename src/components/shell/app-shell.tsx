import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ThemePreference } from "@/lib/account/preferences";
import { focusRing } from "@/components/ui/focus";
import { ThemeSync } from "@/components/theme/theme";
import { BottomNav, SideNav } from "./nav";
import { SettingsIcon } from "./icons";

export function AppShell({
  children,
  theme,
}: {
  children: ReactNode;
  theme: ThemePreference;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <ThemeSync theme={theme} />
      <aside className="border-line sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r px-4 py-6 lg:flex">
        <Brand />
        <SideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-28 lg:px-8 lg:pt-8 lg:pb-10">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

async function Brand({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations("Shell");

  return (
    <Link
      href="/"
      className={`font-display text-ink leading-none font-semibold tracking-tight ${
        compact ? "text-3xl" : `mb-8 px-3 text-4xl ${focusRing}`
      } ${compact ? focusRing : ""}`}
    >
      {t("brand")}
    </Link>
  );
}

async function MobileHeader() {
  const t = await getTranslations("Shell");

  return (
    <div className="flex items-center justify-between px-4 pt-3 lg:hidden">
      <Brand compact />
      <Link
        href="/installningar"
        aria-label={t("settings")}
        className={`text-ink rounded-control inline-flex size-11 items-center justify-center ${focusRing}`}
      >
        <SettingsIcon />
      </Link>
    </div>
  );
}
