import { headers } from "next/headers";

import { createErrorResponse } from "@/lib/api-error";

const DEMO_ERROR_RESPONSES = {
  unauthorized: {
    status: 401,
    message: "Missing or invalid Bearer token.",
  },
  token_expired: {
    status: 401,
    message: "The bearer token has expired.",
  },
  validation_error: {
    status: 400,
    message: "Query parameters did not pass validation.",
    details: {
      locale: "Expected zh or en.",
    },
  },
  rate_limit_exceeded: {
    status: 429,
    message: "Request rate exceeded the sliding window limit.",
  },
  captcha_required: {
    status: 429,
    message: "Captcha verification is required before continuing.",
    details: {
      captcha_sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? "",
    },
  },
  platform_at_capacity: {
    status: 503,
    message: "The platform has reached its concurrency threshold.",
  },
} as const;

export async function GET(request: Request) {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  if (error && error in DEMO_ERROR_RESPONSES) {
    const demoError = DEMO_ERROR_RESPONSES[error as keyof typeof DEMO_ERROR_RESPONSES];

    return createErrorResponse(
      demoError.status,
      error as keyof typeof DEMO_ERROR_RESPONSES,
      demoError.message,
      "details" in demoError ? (demoError.details ?? {}) : {},
    );
  }

  if (!authorization) {
    return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
  }

  return Response.json({
    ok: true,
  });
}
