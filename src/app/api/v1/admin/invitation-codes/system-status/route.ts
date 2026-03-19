import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdminSession();
    const supabase = createAdminClient();

    const [{ data: config }, { count: totalUsers }, { count: activatedUsers }] = await Promise.all([
      supabase
        .from("platform_config")
        .select("value")
        .eq("key", "invitation_code_enabled")
        .maybeSingle(),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("is_activated", true),
    ]);

    return Response.json({
      invitation_code_enabled: config?.value !== "false",
      total_users: totalUsers ?? 0,
      activated_users: activatedUsers ?? 0,
      pending_users: Math.max((totalUsers ?? 0) - (activatedUsers ?? 0), 0),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
