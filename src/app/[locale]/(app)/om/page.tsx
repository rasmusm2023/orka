import { getTranslations } from "next-intl/server";

export const instant = false;

export default async function AboutPage() {
  const t = await getTranslations("About");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <div className="mt-8 flex flex-col gap-4 text-base">
        <p>{t("slv")}</p>
        <p>{t("off")}</p>
      </div>
    </div>
  );
}
