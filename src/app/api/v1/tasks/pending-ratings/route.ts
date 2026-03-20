import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { listPendingRatings } from "@/lib/tasks/queries";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const tasks = await listPendingRatings(userId);

    return Response.json({
      tasks,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
