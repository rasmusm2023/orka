import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  localeCookieName,
  localeFromCookie,
  pathnameForLocale,
} from "./lib/locale-path";
import { getSupabaseEnv } from "./lib/supabase/env";
import { updateSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

function applySession(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) {
      to.headers.set(header, value);
    }
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/auth") && !pathname.startsWith("/api")) {
    const preferred = localeFromCookie(
      request.cookies.get(localeCookieName)?.value,
    );
    if (preferred) {
      const target = pathnameForLocale(pathname, preferred);
      if (target !== pathname) {
        const url = request.nextUrl.clone();
        url.pathname = target;
        return NextResponse.redirect(url);
      }
    }
  }

  const skipLocale =
    pathname.startsWith("/api") || pathname.startsWith("/auth");
  const response = skipLocale
    ? NextResponse.next({ request })
    : handleI18nRouting(request);

  const env = getSupabaseEnv();
  if (!env) {
    return response;
  }

  const sessionResponse = await updateSession(request, env);
  applySession(sessionResponse, response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
