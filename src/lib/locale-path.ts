export const localeCookieName = "kondis-locale";

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/en") {
    return "/";
  }

  if (pathname.startsWith("/en/")) {
    return pathname.slice(3);
  }

  return pathname;
}

export function pathnameForLocale(
  pathname: string,
  locale: "sv" | "en",
): string {
  const bare = stripLocalePrefix(pathname);
  if (locale === "sv") {
    return bare;
  }

  return bare === "/" ? "/en" : `/en${bare}`;
}

export function localeFromCookie(
  value: string | undefined,
): "sv" | "en" | null {
  if (value === "sv" || value === "en") {
    return value;
  }

  return null;
}
