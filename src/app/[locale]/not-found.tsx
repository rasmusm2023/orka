import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="flex flex-1 flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted mt-3 text-lg">{t("body")}</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center text-base font-medium underline-offset-4 hover:underline"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
