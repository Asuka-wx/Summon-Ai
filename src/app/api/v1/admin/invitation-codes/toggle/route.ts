import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminSession();
    const { enabled } = (await request.json()) as {
      enabled?: boolean;
    };

    if (typeof enabled !== "boolean") {
      return createErrorResponse(400, "validation_error", "enabled must be a boolean.", {
        enabled: "Expected boolean value.",
      });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("toggle_invitation_code_system", {
      p_admin_id: admin.userId,
      p_enabled: enabled,
    });

    if (error) {
      // Fallback path for environments where the database RPC was created with an
      // incompatible JSONB write expression during partial migration rollout.
      const { count: pendingUsers } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("is_activated", false);

      await supabase.from("platform_config").upsert(
        {
          key: "invitation_code_enabled",
          value: enabled,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        },
      );

      let bulkActivatedUsers = 0;

      if (!enabled) {
        await supabase
          .from("users")
          .update({
            is_activated: true,
            activated_at: new Date().toISOString(),
          })
          .eq("is_activated", false);

        bulkActivatedUsers = pendingUsers ?? 0;
      }

      await supabase.from("audit_logs").insert({
        event_type: "invitation_code_system_toggled",
        user_id: admin.userId,
        amount: 0,
        metadata: {
          enabled,
          bulk_activated_count: bulkActivatedUsers,
          fallback: true,
          original_error: error.message,
        },
      });

      return Response.json({
        status: "success",
        enabled,
        bulk_activated_users: bulkActivatedUsers,
      });
    }

    return Response.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
