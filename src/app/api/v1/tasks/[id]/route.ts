import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { getUserTaskSnapshot } from "@/lib/tasks/queries";

type TaskRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: TaskRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const task = await getUserTaskSnapshot(userId, id);

    return Response.json(task);
  } catch (error) {
    return toErrorResponse(error);
  }
}
