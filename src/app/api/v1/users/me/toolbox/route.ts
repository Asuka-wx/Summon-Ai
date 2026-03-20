import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { listUserToolbox } from "@/lib/users/engagement";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const items = await listUserToolbox(userId);

    return Response.json({
      items,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
