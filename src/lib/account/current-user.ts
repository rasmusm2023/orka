import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  activityLevels,
  sexes,
  type ActivityLevel,
  type Sex,
} from "@/lib/goals/calculator";
import {
  profileLocales,
  themes,
  type ProfileLocale,
  type ThemePreference,
} from "./preferences";
import { isMissingSchema, SchemaMissingError } from "./schema-error";

export type { ProfileLocale, ThemePreference };

const optionalNumber = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => (value == null ? null : Number(value)))
  .refine((value) => value == null || Number.isFinite(value));

const profileSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  locale: z.enum(profileLocales),
  timezone: z.string().min(1),
  sex: z.enum(sexes).nullable(),
  birth_date: z.string().nullable(),
  height_cm: optionalNumber,
  activity_level: z.enum(activityLevels).nullable(),
  theme: z.enum(themes),
  onboarding_completed_at: z.string().nullable(),
});

export type Profile = {
  userId: string;
  displayName: string;
  locale: ProfileLocale;
  timezone: string;
  sex: Sex | null;
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: ActivityLevel | null;
  theme: ThemePreference;
  onboardingCompletedAt: string | null;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Profile;
};

function toProfile(row: z.infer<typeof profileSchema>): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    locale: row.locale,
    timezone: row.timezone,
    sex: row.sex,
    birthDate: row.birth_date,
    heightCm: row.height_cm,
    activityLevel: row.activity_level,
    theme: row.theme,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

export async function getAuthIdentity(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return null;
  }

  const email = data.claims.email;
  return {
    id: data.claims.sub,
    email: typeof email === "string" ? email : null,
  };
}

async function loadProfile(userId: string): Promise<Profile> {
  const supabase = await createClient();
  const existing = await supabase
    .from("profiles")
    .select(
      "user_id, display_name, locale, timezone, sex, birth_date, height_cm, activity_level, theme, onboarding_completed_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (existing.error) {
    if (isMissingSchema(existing.error)) {
      throw new SchemaMissingError();
    }
    throw new Error(existing.error.message);
  }

  let row = existing.data;
  if (!row) {
    const inserted = await supabase
      .from("profiles")
      .insert({ user_id: userId })
      .select(
        "user_id, display_name, locale, timezone, sex, birth_date, height_cm, activity_level, theme, onboarding_completed_at",
      )
      .single();

    if (inserted.error) {
      if (isMissingSchema(inserted.error)) {
        throw new SchemaMissingError();
      }
      throw new Error(inserted.error.message);
    }
    row = inserted.data;
  }

  return toProfile(profileSchema.parse(row));
}

export async function getCurrentUser(): Promise<
  | { status: "signed-out" }
  | { status: "schema" }
  | { status: "ready"; user: CurrentUser }
> {
  const identity = await getAuthIdentity();
  if (!identity) {
    return { status: "signed-out" };
  }

  try {
    const profile = await loadProfile(identity.id);
    return {
      status: "ready",
      user: { id: identity.id, email: identity.email, profile },
    };
  } catch (error) {
    if (error instanceof SchemaMissingError) {
      return { status: "schema" };
    }
    throw error;
  }
}
