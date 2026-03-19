import { createErrorResponse } from "@/lib/api-error";
import { setPlatformConfigValue, getPlatformConfigValue } from "@/lib/platform-config/service";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const maintenanceMode = await getPlatformConfigValue("maintenance_mode", {
    enabled: false,
  });

  return Response.json(maintenanceMode);
}

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

    await setPlatformConfigValue("maintenance_mode", { enabled }, "Supplier maintenance mode toggle.");

    if (enabled) {
      const supabase = createAdminClient();
      await supabase
        .from("tasks")
        .update({
          status: "paused",
          pause_reason: "await_user",
          paused_at: new Date().toISOString(),
          pause_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("status", "active");
    }

    await fetch(new URL("/relay/maintenance", process.env.RELAY_INTERNAL_URL ?? "http://127.0.0.1:8080"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${process.env.RELAY_SECRET ?? ""}`,
      },
      body: JSON.stringify({ enabled, actor_id: admin.userId }),
    }).catch(() => {});

    return Response.json({
      enabled,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
