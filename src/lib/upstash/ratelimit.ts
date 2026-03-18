import { Ratelimit } from "@upstash/ratelimit";

import { getRedisClient } from "@/lib/upstash/client";

export function createApiRatelimit(
  prefix: string,
  maxRequests = 30,
  interval: `${number} s` | `${number} m` | `${number} h` = "1 m",
) {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, interval),
    prefix,
    analytics: true,
  });
}
