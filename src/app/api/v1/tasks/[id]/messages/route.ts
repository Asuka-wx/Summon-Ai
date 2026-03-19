import { createErrorResponse } from "@/lib/api-error";
import { sendTaskMessage } from "@/lib/matchmaking/service";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskMessagesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskMessagesRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const { id } = await params;
    const body = (await request.json()) as {
      content?: string;
    };

    if (!body.content || body.content.trim().length === 0) {
      return createErrorResponse(400, "validation_error", "Message content is required.", {
        content: "Expected non-empty content.",
      });
    }

    const result = await sendTaskMessage({
      taskId: id,
      userId: currentUser.id,
      content: body.content.trim(),
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
