import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as localeParam } from "next/root-params";
import { notFound } from "next/navigation";
import { routing } from "./routing";

const catalogs = {
  sv: () => import("../../messages/sv.json"),
  en: () => import("../../messages/en.json"),
} as const;

export default getRequestConfig(async ({ locale: requested }) => {
  let locale = requested;

  if (!locale) {
    const paramValue = await localeParam();
    if (!hasLocale(routing.locales, paramValue)) {
      notFound();
    }
    locale = paramValue;
  }

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await catalogs[locale]()).default,
  };
});
