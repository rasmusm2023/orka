"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { signOut } from "@/lib/account/actions";
import type { AppLocale } from "@/i18n/routing";
import { focusRing } from "@/components/ui/focus";
import {
  FoodIcon,
  ProgressIcon,
  SettingsIcon,
  TodayIcon,
  TrainingIcon,
} from "./icons";

const items = [
  { href: "/", labelKey: "today", icon: TodayIcon },
  { href: "/mat", labelKey: "food", icon: FoodIcon },
  { href: "/traning", labelKey: "training", icon: TrainingIcon },
  { href: "/framsteg", labelKey: "progress", icon: ProgressIcon },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav() {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const locale = useLocale() as AppLocale;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label={t("menu")} className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-control flex min-h-11 items-center gap-3 px-3 text-base ${
                active
                  ? "bg-track text-ink font-medium"
                  : "text-muted hover:bg-track hover:text-ink"
              } ${focusRing}`}
            >
              <Icon className="size-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
        <Link
          href="/installningar"
          aria-current={
            isActive(pathname, "/installningar") ? "page" : undefined
          }
          className={`rounded-control flex min-h-11 items-center gap-3 px-3 text-base ${
            isActive(pathname, "/installningar")
              ? "bg-track text-ink font-medium"
              : "text-muted hover:bg-track hover:text-ink"
          } ${focusRing}`}
        >
          <SettingsIcon className="size-5" />
          {t("settings")}
        </Link>
      </nav>
      <form action={signOut.bind(null, locale)} className="mt-auto pt-6">
        <button
          type="submit"
          className={`text-muted hover:text-ink rounded-control min-h-11 w-full px-3 text-left text-base ${focusRing}`}
        >
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}

export function BottomNav() {
  const t = useTranslations("Shell");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("menu")}
      className="border-line bg-surface fixed inset-x-0 bottom-0 z-20 flex border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              active ? "text-ink font-medium" : "text-muted"
            } ${focusRing}`}
          >
            <Icon className="size-6" />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
