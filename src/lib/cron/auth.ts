import { createErrorResponse } from "@/lib/api-error";

export function authorizeCronRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!authorization) {
    return createErrorResponse(401, "unauthorized", "Missing Bearer token for cron request.");
  }

  const providedSecret = authorization.replace(/^Bearer\s+/i, "");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return createErrorResponse(403, "cron_secret_invalid", "Invalid cron secret.");
  }

  return null;
}
