import { createApiError } from "@/lib/errors";
import { createErrorResponse } from "@/lib/api-error";

export function toAdminAccessErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "unauthorized") {
    return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
  }

  if (error.message === "mfa_required") {
    return createErrorResponse(401, "mfa_required", "2FA verification required.");
  }

  if (error.message === "admin_required") {
    return createErrorResponse(403, "admin_required", "Admin access required.");
  }

  if (error.message === "rate_limit_exceeded") {
    const retryAfterSeconds =
      "retryAfterSeconds" in error && typeof error.retryAfterSeconds === "number"
        ? error.retryAfterSeconds
        : 60;

    return Response.json(
      createApiError(
        "rate_limit_exceeded",
        "Too many admin requests. Please slow down.",
      ),
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  return null;
}
