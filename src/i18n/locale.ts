import { hasLocale } from "next-intl";
import { locale as localeParam } from "next/root-params";
import { routing, type AppLocale } from "./routing";

export async function getLocale(): Promise<AppLocale> {
  const value = await localeParam();
  if (!hasLocale(routing.locales, value)) {
    return routing.defaultLocale;
  }

  return value;
}
