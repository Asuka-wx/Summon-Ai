import { listUserBadges } from "@/lib/badges/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const badges = await listUserBadges(userId);

    return Response.json({
      badges,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
