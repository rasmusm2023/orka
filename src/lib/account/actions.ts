"use server";

import { cookies, headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { hasLocale } from "next-intl";
import { routing, type AppLocale } from "@/i18n/routing";
import { localeCookieName } from "@/lib/locale-path";
import {
  ageOnDate,
  calculateTargets,
  targetRateKgPerWeek,
} from "@/lib/goals/calculator";
import { goalInputSchema } from "@/lib/goals/input";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./current-user";
import { themes } from "./preferences";
import { todayForTimezone } from "./records";

const themeSchema = z.enum(themes);

function profileLocale(locale: AppLocale): "sv-SE" | "en" {
  return locale === "en" ? "en" : "sv-SE";
}

function asLocale(value: string): AppLocale {
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error("The request has no host.");
  }
  return `${proto}://${host}`;
}

function homePath(locale: AppLocale): string {
  return locale === "en" ? "/en" : "/";
}

async function setLocaleCookie(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(72),
});

type AuthFailure =
  "invalid" | "weak" | "credentials" | "exists" | "confirm" | "rate" | "error";

function authFailure(error: { code?: string; message?: string }): AuthFailure {
  if (error.code === "over_email_send_rate_limit") {
    return "rate";
  }
  if (
    error.code === "email_address_invalid" ||
    error.code === "validation_failed"
  ) {
    return "invalid";
  }
  if (error.code === "weak_password") {
    return "weak";
  }
  if (error.code === "invalid_credentials") {
    return "credentials";
  }
  if (error.code === "email_not_confirmed") {
    return "confirm";
  }
  if (
    error.code === "user_already_exists" ||
    error.code === "email_exists" ||
    error.message?.toLowerCase().includes("already registered")
  ) {
    return "exists";
  }
  return "error";
}

function parsedCredentials(
  email: string,
  password: string,
):
  | { ok: true; email: string; password: string }
  | { ok: false; status: "invalid" | "weak" } {
  const parsed = credentialsSchema.safeParse({
    email: email.trim(),
    password,
  });
  if (parsed.success) {
    return {
      ok: true,
      email: parsed.data.email,
      password: parsed.data.password,
    };
  }

  const passwordIssue = parsed.error.issues.some(
    (issue) => issue.path[0] === "password",
  );
  return { ok: false, status: passwordIssue ? "weak" : "invalid" };
}

export async function signInWithPassword(
  email: string,
  password: string,
  locale: AppLocale,
): Promise<{ status: AuthFailure } | void> {
  const parsed = parsedCredentials(email, password);
  if (!parsed.ok) {
    return { status: parsed.status };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    return { status: authFailure(error) };
  }

  redirect({ href: "/", locale });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  locale: AppLocale,
): Promise<{ status: AuthFailure } | void> {
  const parsed = parsedCredentials(email, password);
  if (!parsed.ok) {
    return { status: parsed.status };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const next = homePath(locale);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { status: authFailure(error) };
  }

  if (!data.session) {
    return { status: "confirm" };
  }

  redirect({ href: "/", locale });
}

export async function signInWithGoogle(
  locale: AppLocale,
): Promise<{ status: "error" } | void> {
  const supabase = await createClient();
  const origin = await requestOrigin();
  const next = homePath(locale);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return { status: "error" };
  }

  nextRedirect(data.url);
}

export async function signOut(locale: AppLocale) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/logga-in", locale });
}

export async function skipOnboarding(locale: AppLocale) {
  locale = asLocale(locale);
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    redirect({ href: "/logga-in", locale });
  }
  const user = result.status === "ready" ? result.user : null;
  if (!user) {
    return { error: "save" as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) {
    return { error: "save" as const };
  }

  await setLocaleCookie(locale);
  redirect({ href: "/", locale });
}

export async function saveGoal(
  input: unknown,
  mode: "onboarding" | "edit",
  locale: AppLocale,
): Promise<{ error: "invalid" | "age" | "save" } | void> {
  locale = asLocale(locale);
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    redirect({ href: "/logga-in", locale });
  }
  const user = result.status === "ready" ? result.user : null;
  if (!user) {
    return { error: "save" };
  }

  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid" };
  }

  const today = await todayForTimezone(user.profile.timezone);
  const age = ageOnDate(parsed.data.birthDate, today);
  if (age < 15 || age > 100) {
    return { error: "age" };
  }

  const calculated = calculateTargets({
    sex: parsed.data.sex,
    ageYears: age,
    heightCm: parsed.data.heightCm,
    weightKg: parsed.data.weightKg,
    activityLevel: parsed.data.activityLevel,
    goalType: parsed.data.goalType,
  });

  const supabase = await createClient();
  const weight = await supabase.from("body_metrics").upsert(
    {
      user_id: user.id,
      log_date: today,
      weight_kg: parsed.data.weightKg,
    },
    { onConflict: "user_id,log_date" },
  );
  if (weight.error) {
    return { error: "save" };
  }

  const goal = await supabase.from("goals").insert({
    user_id: user.id,
    effective_from: today,
    kcal: parsed.data.kcal,
    protein_g: parsed.data.proteinG,
    carbs_g: parsed.data.carbsG,
    fat_g: parsed.data.fatG,
    goal_type: parsed.data.goalType,
    target_rate_kg_per_week: targetRateKgPerWeek(
      calculated.tdee,
      parsed.data.kcal,
    ),
  });
  if (goal.error) {
    return { error: "save" };
  }

  const profile = await supabase
    .from("profiles")
    .update({
      sex: parsed.data.sex,
      birth_date: parsed.data.birthDate,
      height_cm: parsed.data.heightCm,
      activity_level: parsed.data.activityLevel,
      locale: profileLocale(locale),
      onboarding_completed_at:
        user.profile.onboardingCompletedAt ?? new Date().toISOString(),
    })
    .eq("user_id", user.id);
  if (profile.error) {
    return { error: "save" };
  }

  await setLocaleCookie(locale);
  redirect({ href: mode === "edit" ? "/installningar" : "/", locale });
}

export async function updateTheme(theme: unknown, locale: AppLocale) {
  locale = asLocale(locale);
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) {
    return { error: "invalid" as const };
  }
  const result = await getCurrentUser();
  if (result.status !== "ready") {
    redirect({ href: "/logga-in", locale });
  }
  const user = result.status === "ready" ? result.user : null;
  if (!user) {
    return { error: "save" as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ theme: parsed.data })
    .eq("user_id", user.id);

  return { error: error ? ("save" as const) : null };
}

export async function updateLocale(nextLocale: AppLocale) {
  if (!hasLocale(routing.locales, nextLocale)) {
    return { error: "invalid" as const };
  }

  const result = await getCurrentUser();
  if (result.status !== "ready") {
    redirect({ href: "/logga-in", locale: nextLocale });
  }
  const user = result.status === "ready" ? result.user : null;
  if (!user) {
    return { error: "save" as const };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ locale: profileLocale(nextLocale) })
    .eq("user_id", user.id);

  if (error) {
    return { error: "save" as const };
  }

  await setLocaleCookie(nextLocale);
  return { error: null };
}
