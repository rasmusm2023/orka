import type { AppLocale } from "./routing";

const formattingLocales = {
  sv: "sv-SE",
  en: "en",
} as const satisfies Record<AppLocale, string>;

export function formattingLocale(locale: AppLocale): string {
  return formattingLocales[locale];
}
