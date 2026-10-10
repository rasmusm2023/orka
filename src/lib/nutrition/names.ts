export function foodLabel(
  nameSv: string,
  nameEn: string | null | undefined,
  locale: "sv" | "en",
): string {
  if (locale === "en" && nameEn) {
    return nameEn;
  }

  return nameSv || nameEn || "";
}
