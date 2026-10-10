import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { localeCookieName } from "@/lib/locale-path";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://")
  ) {
    return "/";
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/logga-in?fel=1", url.origin));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      return NextResponse.redirect(new URL("/logga-in?fel=1", url.origin));
    }
  } else {
    return NextResponse.redirect(new URL("/logga-in?fel=1", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale, onboarding_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const completed = Boolean(profile?.onboarding_completed_at);
  const locale = profile?.locale === "en" ? "en" : "sv";
  const destination = completed ? (locale === "en" ? "/en" : "/") : next;
  const response = NextResponse.redirect(new URL(destination, url.origin));

  if (completed) {
    response.cookies.set(localeCookieName, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}
