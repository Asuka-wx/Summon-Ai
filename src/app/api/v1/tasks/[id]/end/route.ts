import { endTask } from "@/lib/matchmaking/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskEndRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: TaskEndRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const result = await endTask({
      taskId: id,
      userId,
      endReason: "user_ended",
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
