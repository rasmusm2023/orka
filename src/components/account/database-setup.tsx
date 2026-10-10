import { getTranslations } from "next-intl/server";

export async function DatabaseSetup() {
  const t = await getTranslations("Database");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="text-muted mt-3 text-base">{t("body")}</p>
    </main>
  );
}
