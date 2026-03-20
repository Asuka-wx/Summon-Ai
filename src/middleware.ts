import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/i18n/routing";
import { activationGuard } from "@/middleware/activation-guard";
import { adminGuard } from "@/middleware/admin-guard";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const response = isApiRequest ? NextResponse.next() : intlMiddleware(request);

  if (!isApiRequest && response.headers.get("location")) {
    return response;
  }

  const adminResult = await adminGuard(request, response);
  if (adminResult) {
    return adminResult;
  }

  const activationResult = await activationGuard(request, response);
  if (activationResult) {
    return activationResult;
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
