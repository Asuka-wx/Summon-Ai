import { createApiError } from "@/lib/errors";
import { createApiRatelimit } from "@/lib/upstash/ratelimit";

export function getRequestIp(request: Request) {
  return (
    request.headers.get("fly-client-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function enforceRateLimit({
  key,
  prefix,
  maxRequests,
  interval,
  message = "Too many requests. Please slow down.",
}: {
  key: string;
  prefix: string;
  maxRequests: number;
  interval: `${number} s` | `${number} m` | `${number} h`;
  message?: string;
}) {
  const limiter = createApiRatelimit(prefix, maxRequests, interval);

  if (!limiter) {
    return null;
  }

  const result = await limiter.limit(key);

  if (result.success) {
    return null;
  }

  const resetTime =
    typeof result.reset === "number" ? result.reset : Date.now() + 60_000;
  const retryAfter = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));

  return Response.json(
    createApiError("rate_limit_exceeded", message),
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}
