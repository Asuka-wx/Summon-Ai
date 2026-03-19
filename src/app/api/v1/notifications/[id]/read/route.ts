import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";

type NotificationReadRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: NotificationReadRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const supabase = createAdminClient();

    await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id)
      .eq("user_id", userId);

    return Response.json({
      ok: true,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
