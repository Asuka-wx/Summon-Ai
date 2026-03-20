import { createErrorResponse } from "@/lib/api-error";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTotpToken } from "@/lib/security/totp";
import { getRedisClient } from "@/lib/upstash/client";

export async function POST(request: Request) {
  try {
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
    }

    const body = (await request.json()) as {
      token?: string;
    };

    if (!body.token) {
      return createErrorResponse(400, "validation_error", "Token is required.", {
        token: "Expected 6-digit TOTP token.",
      });
    }

    const supabase = createAdminClient();
    const { data: adminUser, error } = await supabase
      .from("users")
      .select("id, role, totp_secret, totp_enabled_at")
      .eq("id", user.id)
      .single();

    if (error || !adminUser || adminUser.role !== "admin") {
      return createErrorResponse(403, "admin_required", "Admin access required.");
    }

    if (!adminUser.totp_secret || !adminUser.totp_enabled_at) {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    if (!verifyTotpToken({ secret: adminUser.totp_secret, token: body.token })) {
      return createErrorResponse(401, "mfa_required", "TOTP verification failed.");
    }

    const redis = getRedisClient();
    const ttlHours = Number(process.env.ADMIN_SESSION_MAX_AGE_HOURS ?? 4);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    if (redis) {
      await redis.set(`admin:totp:${adminUser.id}`, { verified: true, expires_at: expiresAt }, {
        ex: ttlHours * 60 * 60,
      });
    }

    return Response.json({
      ok: true,
      expires_at: expiresAt,
    });
  } catch {
    return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
  }
}
