import { createErrorResponse } from "@/lib/api-error";
import { handleDisconnectChoice } from "@/lib/matchmaking/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskDisconnectChoiceRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskDisconnectChoiceRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const body = (await request.json()) as {
      choice?: "wait" | "end";
    };

    if (!body.choice || !["wait", "end"].includes(body.choice)) {
      return createErrorResponse(400, "validation_error", "Choice must be wait or end.", {
        choice: "Expected wait or end.",
      });
    }

    const result = await handleDisconnectChoice({
      taskId: id,
      userId,
      choice: body.choice,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
