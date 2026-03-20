import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";

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

export async function adminGuard(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse | null> {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return null;
  }

  const normalized = stripLocalePrefix(request.nextUrl.pathname);

  if (!normalized.pathname.startsWith("/admin")) {
    return null;
  }

  const supabase = await createMiddlewareSupabaseClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/${normalized.locale}`, request.url));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.redirect(new URL(`/${normalized.locale}`, request.url));
  }

  return null;
}
