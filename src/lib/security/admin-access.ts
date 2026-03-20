import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createApiRatelimit } from "@/lib/upstash/ratelimit";
import { getRedisClient } from "@/lib/upstash/client";

type AdminSession = {
  userId: string;
  role: string;
  totpEnabledAt: string | null;
};

type RateLimitError = Error & {
  retryAfterSeconds?: number;
};

export async function requireAdminSession(
  supabase: SupabaseClient = createAdminClient(),
  options?: {
    requireTotpSession?: boolean;
    allowMissingTotpSetup?: boolean;
    applyRateLimit?: boolean;
  },
): Promise<AdminSession> {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, role, totp_enabled_at")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error("admin_required");
  }

  if (data.role !== "admin") {
    throw new Error("admin_required");
  }

  if (
    (process.env.ADMIN_2FA_REQUIRED ?? "true") === "true" &&
    !data.totp_enabled_at &&
    !options?.allowMissingTotpSetup
  ) {
    throw new Error("mfa_required");
  }

  const requireTotpSession = options?.requireTotpSession ?? true;
  const redis = getRedisClient();

  if (
    requireTotpSession &&
    (process.env.ADMIN_2FA_REQUIRED ?? "true") === "true" &&
    data.totp_enabled_at &&
    redis
  ) {
    const session = await redis.get<{ verified?: boolean }>(`admin:totp:${data.id}`);

    if (!session?.verified) {
      throw new Error("mfa_required");
    }
  }

  if (options?.applyRateLimit !== false) {
    const limiter = createApiRatelimit("admin-api", 120, "1 m");

    if (limiter) {
      const result = await limiter.limit(data.id);

      if (!result.success) {
        const resetTime =
          typeof result.reset === "number" ? result.reset : Date.now() + 60_000;
        const error = new Error("rate_limit_exceeded") as RateLimitError;
        error.retryAfterSeconds = Math.max(
          1,
          Math.ceil((resetTime - Date.now()) / 1000),
        );
        throw error;
      }
    }
  }

  return {
    userId: data.id,
    role: data.role,
    totpEnabledAt: data.totp_enabled_at,
  };
}
