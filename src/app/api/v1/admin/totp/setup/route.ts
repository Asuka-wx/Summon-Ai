import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminTotp, createTotpQrCodeDataUrl } from "@/lib/security/totp";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const adminSession = await requireAdminSession(undefined, {
      requireTotpSession: false,
      allowMissingTotpSetup: true,
    });
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", adminSession.userId)
      .single();

    const { secret, otpauthUri } = createAdminTotp(user?.email ?? adminSession.userId);
    const qrCodeDataUrl = await createTotpQrCodeDataUrl(otpauthUri);

    return Response.json({
      secret,
      otpauthUri,
      qrCodeDataUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
