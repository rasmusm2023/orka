"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { updateLocale, updateTheme } from "@/lib/account/actions";
import type { AppLocale } from "@/i18n/routing";
import { themes, type ThemePreference } from "@/lib/account/preferences";
import { applyTheme } from "@/components/theme/theme";
import { Chip } from "@/components/ui/chip";

const themeLabels = {
  system: "system",
  light: "light",
  dark: "dark",
} as const;

export function ThemePicker({ theme }: { theme: ThemePreference }) {
  const t = useTranslations("Settings");
  const locale = useLocale() as AppLocale;
  const [current, setCurrent] = useState(theme);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {themes.map((option) => (
        <Chip
          key={option}
          label={t(themeLabels[option])}
          selected={current === option}
          onSelect={() => {
            setCurrent(option);
            applyTheme(option);
            startTransition(async () => {
              const result = await updateTheme(option, locale);
              if (result?.error) {
                setCurrent(theme);
                applyTheme(theme);
              }
            });
          }}
        />
      ))}
      {pending ? <span className="sr-only">{t("saving")}</span> : null}
    </div>
  );
}

export function LanguagePicker() {
  const t = useTranslations("Settings");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: AppLocale) {
    startTransition(async () => {
      const result = await updateLocale(next);
      if (!result?.error) {
        router.replace(pathname, { locale: next });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Chip
        label={t("swedish")}
        selected={locale === "sv"}
        onSelect={() => choose("sv")}
      />
      <Chip
        label={t("english")}
        selected={locale === "en"}
        onSelect={() => choose("en")}
      />
      {pending ? <span className="sr-only">{t("saving")}</span> : null}
    </div>
  );
}
