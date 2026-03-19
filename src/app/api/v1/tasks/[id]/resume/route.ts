import { resumeTask } from "@/lib/matchmaking/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskResumeRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: TaskResumeRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const result = await resumeTask({
      taskId: id,
      userId,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
