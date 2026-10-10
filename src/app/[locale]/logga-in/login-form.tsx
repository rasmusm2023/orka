"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/account/actions";
import type { AppLocale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type FormError =
  | "invalid"
  | "weak"
  | "credentials"
  | "exists"
  | "confirm"
  | "rate"
  | "error"
  | "google"
  | "callback";

export function LoginForm({ failed }: { failed: boolean }) {
  const t = useTranslations("Auth");
  const locale = useLocale() as AppLocale;
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<FormError | null>(
    failed ? "callback" : null,
  );
  const [pending, startTransition] = useTransition();

  const message: Record<Exclude<FormError, "google">, string> = {
    invalid: t("invalidEmail"),
    weak: t("weak"),
    credentials: t("credentials"),
    exists: t("exists"),
    confirm: t("confirm"),
    rate: t("rateLimit"),
    error: t("error"),
    callback: t("callbackError"),
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const submit =
            mode === "signIn" ? signInWithPassword : signUpWithPassword;
          startTransition(async () => {
            const result = await submit(email, password, locale);
            if (result?.status) {
              setError(result.status);
            }
          });
        }}
      >
        <TextField
          label={t("email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label={t("password")}
          type="password"
          autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          value={password}
          hint={mode === "signUp" ? t("passwordHint") : undefined}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? t("working")
            : mode === "signIn"
              ? t("signIn")
              : t("signUp")}
        </Button>
      </form>
      {error && error !== "google" ? (
        <p role="alert" className="text-over text-sm">
          {message[error]}
        </p>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          setMode((current) => (current === "signIn" ? "signUp" : "signIn"));
        }}
      >
        {mode === "signIn" ? t("switchToSignUp") : t("switchToSignIn")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await signInWithGoogle(locale);
            if (result?.status === "error") {
              setError("google");
            }
          });
        }}
      >
        {t("google")}
      </Button>
      {error === "google" ? (
        <p role="alert" className="text-over text-sm">
          {t("googleError")}
        </p>
      ) : null}
    </div>
  );
}
