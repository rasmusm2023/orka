import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "@/i18n/locale";
import { getAuthIdentity } from "@/lib/account/current-user";
import { LoginForm } from "./login-form";

export const instant = false;

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="bg-track rounded-control mx-auto mt-8 h-8 w-32 motion-safe:animate-pulse" />
      }
    >
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const identity = await getAuthIdentity();
  if (identity) {
    redirect({ href: "/", locale });
  }

  const params = await searchParams;
  const t = await getTranslations("Auth");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-display text-6xl leading-none font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="text-muted mt-3 text-lg">{t("tagline")}</p>
      <LoginForm failed={params.fel === "1"} />
    </main>
  );
}
