import { createErrorResponse } from "@/lib/api-error";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type InvitationCodePatchRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: InvitationCodePatchRouteContext) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = (await request.json()) as {
      is_active?: boolean;
      note?: string;
    };

    const payload: Record<string, unknown> = {};
    if (typeof body.is_active === "boolean") {
      payload.is_active = body.is_active;
    }
    if (typeof body.note === "string") {
      payload.note = body.note;
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("invitation_codes")
      .update(payload)
      .eq("id", id);

    if (error) {
      return createErrorResponse(500, "validation_error", error.message);
    }

    return Response.json({
      status: "updated",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "mfa_required") {
      return createErrorResponse(401, "mfa_required", "2FA verification required.");
    }

    return createErrorResponse(403, "admin_required", "Admin access required.");
  }
}
