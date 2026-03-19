import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const userId = await requireCurrentUserId();
    const supabase = createAdminClient();

    await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", userId)
      .eq("is_read", false);

    return Response.json({
      ok: true,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
