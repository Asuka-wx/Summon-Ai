import { createErrorResponse } from "@/lib/api-error";
import { confirmTaskAction } from "@/lib/matchmaking/service";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskConfirmRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskConfirmRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const body = (await request.json()) as {
      action?: "continue" | "end";
    };

    if (!body.action || !["continue", "end"].includes(body.action)) {
      return createErrorResponse(400, "validation_error", "Action must be continue or end.", {
        action: "Expected continue or end.",
      });
    }

    const result = await confirmTaskAction({
      taskId: id,
      userId: currentUser.id,
      action: body.action,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
