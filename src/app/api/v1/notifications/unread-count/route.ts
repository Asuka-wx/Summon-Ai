import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      throw new Error("validation_error");
    }

    return Response.json({
      unread_count: count ?? 0,
      poll_interval_seconds: Number(process.env.NOTIFICATION_POLL_INTERVAL_SECONDS ?? 30),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
