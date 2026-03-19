import { createErrorResponse } from "@/lib/api-error";
import { selectAgentForBroadcast } from "@/lib/matchmaking/service";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskSelectRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskSelectRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const { id } = await params;
    const body = (await request.json()) as {
      agentId?: string;
    };

    if (!body.agentId) {
      return createErrorResponse(400, "validation_error", "Agent id is required.", {
        agentId: "Expected agent id.",
      });
    }

    const task = await selectAgentForBroadcast({
      broadcastId: id,
      agentId: body.agentId,
      userId: currentUser.id,
    });

    return Response.json({
      taskId: task.id,
      sessionId: task.session_id,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
