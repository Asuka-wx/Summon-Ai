import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { verifyTotpToken } from "@/lib/security/totp";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const adminSession = await requireAdminSession(undefined, {
      requireTotpSession: false,
      allowMissingTotpSetup: true,
    });
    const body = (await request.json()) as {
      secret?: string;
      token?: string;
    };

    if (!body.secret || !body.token) {
      return createErrorResponse(400, "validation_error", "Secret and token are required.", {
        token: "Expected secret and token.",
      });
    }

    if (!verifyTotpToken({ secret: body.secret, token: body.token })) {
      return createErrorResponse(403, "mfa_required", "TOTP verification failed.");
    }

    const supabase = createAdminClient();
    await supabase
      .from("users")
      .update({
        totp_secret: body.secret,
        totp_enabled_at: new Date().toISOString(),
      })
      .eq("id", adminSession.userId);

    return Response.json({
      ok: true,
    });
  } catch {
    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
