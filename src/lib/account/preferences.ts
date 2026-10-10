export const themes = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themes)[number];

export const profileLocales = ["sv-SE", "en"] as const;

export type ProfileLocale = (typeof profileLocales)[number];
