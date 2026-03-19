import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";

const ACTIVATION_WHITELIST = [
  "/activate",
  "/auth",
  "/api/auth",
  "/api/activate",
  "/api/v1/activate",
  "/",
  "/waitlist",
  "/agents",
  "/api/agents",
] as const;

const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon",
  "/images",
  "/api/health",
  "/api/v1/health",
  "/api/cron",
  "/api/v1/cron",
  "/api/notifications/unsubscribe",
] as const;

function stripLocalePrefix(pathname: string) {
  const localePrefix = routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!localePrefix) {
    return {
      locale: routing.defaultLocale,
      pathname,
    };
  }

  const stripped = pathname.replace(`/${localePrefix}`, "") || "/";
  return {
    locale: localePrefix,
    pathname: stripped,
  };
}

function isWhitelistedPath(pathname: string) {
  return ACTIVATION_WHITELIST.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function createMiddlewareSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}

export async function activationGuard(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  const normalized = stripLocalePrefix(request.nextUrl.pathname);

  if (isPublicPath(request.nextUrl.pathname) || isWhitelistedPath(normalized.pathname)) {
    return null;
  }

  const supabase = await createMiddlewareSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: config } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "invitation_code_enabled")
    .maybeSingle();

  if (config?.value === "false" || config?.value === false) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_activated")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_activated) {
    return null;
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        code: "NOT_ACTIVATED",
        message: "Please activate your account with an invitation code",
      },
      { status: 403 },
    );
  }

  const activateUrl = new URL(`/${normalized.locale}/activate`, request.url);
  activateUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(activateUrl);
}
