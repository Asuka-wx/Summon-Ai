import { listUserFollowing } from "@/lib/follows/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const items = await listUserFollowing(userId);

    return Response.json({
      items,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
