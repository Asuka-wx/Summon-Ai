import { pauseTask } from "@/lib/matchmaking/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskPauseRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: TaskPauseRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const result = await pauseTask({
      taskId: id,
      userId,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
