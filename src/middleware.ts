import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);
const ALLOWED_PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/early-access",
  "/early-access/success",
]);
const ALLOWED_PUBLIC_API_PATHS = new Set([
  "/api/v1/integrations/tally/early-access",
]);

function isLocalDevelopmentRequest(request: NextRequest) {
  const { hostname } = request.nextUrl;

  return (
    process.env.NODE_ENV === "development" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

function createCanonicalHostRedirect(request: NextRequest) {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredAppUrl) {
    return null;
  }

  try {
    const canonicalUrl = new URL(configuredAppUrl);
    const wwwHost = `www.${canonicalUrl.hostname}`;

    if (request.nextUrl.hostname !== wwwHost) {
      return null;
    }

    const targetUrl = request.nextUrl.clone();
    targetUrl.protocol = canonicalUrl.protocol;
    targetUrl.host = canonicalUrl.host;

    return NextResponse.redirect(targetUrl, 308);
  } catch {
    return null;
  }
}

function stripLocalePrefix(pathname: string) {
  const localePrefix = routing.locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!localePrefix) {
    return {
      locale: routing.defaultLocale,
      pathname,
      hasLocalePrefix: false,
    };
  }

  const stripped = pathname.replace(`/${localePrefix}`, "") || "/";

  return {
    locale: localePrefix,
    pathname: stripped,
    hasLocalePrefix: true,
  };
}

function isAllowedPublicPage(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  const normalized = stripLocalePrefix(pathname);

  return normalized.hasLocalePrefix && ALLOWED_PUBLIC_PAGE_PATHS.has(normalized.pathname);
}

function createPageRedirect(request: NextRequest) {
  const normalized = stripLocalePrefix(request.nextUrl.pathname);

  return NextResponse.redirect(new URL(`/${normalized.locale}`, request.url));
}

function createBlockedApiResponse() {
  return NextResponse.json(
    {
      code: "EARLY_ACCESS_ONLY",
      message: "This deployment only exposes the landing and early access pages.",
    },
    { status: 404 },
  );
}

export default async function middleware(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const isAllowedPublicApiPath = ALLOWED_PUBLIC_API_PATHS.has(request.nextUrl.pathname);

  if (isLocalDevelopmentRequest(request)) {
    if (isApiRequest) {
      return NextResponse.next();
    }

    return intlMiddleware(request);
  }

  const canonicalHostRedirect = createCanonicalHostRedirect(request);

  if (canonicalHostRedirect) {
    return canonicalHostRedirect;
  }

  if (isApiRequest) {
    if (isAllowedPublicApiPath) {
      return NextResponse.next();
    }

    return createBlockedApiResponse();
  }

  if (!isAllowedPublicPage(request.nextUrl.pathname)) {
    return createPageRedirect(request);
  }

  const response = intlMiddleware(request);

  if (!isApiRequest && response.headers.get("location")) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/",
    "/(en|zh)/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
