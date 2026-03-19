import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, metadata, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw new Error("validation_error");
    }

    return Response.json({
      notifications: data ?? [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
