import { createErrorResponse } from "@/lib/api-error";
import { cancelTask } from "@/lib/matchmaking/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskCancelRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskCancelRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const body = (await request.json()) as {
      cancelReason?: "ability_mismatch" | "too_slow" | "need_changed" | "other";
      cancelReasonText?: string;
    };

    if (
      !body.cancelReason ||
      !["ability_mismatch", "too_slow", "need_changed", "other"].includes(body.cancelReason)
    ) {
      return createErrorResponse(400, "invalid_cancel_reason", "Please select a reason for cancellation.", {
        cancelReason: "Expected one of the supported cancel reasons.",
      });
    }

    const result = await cancelTask({
      taskId: id,
      userId,
      cancelReason: body.cancelReason,
      cancelReasonText: body.cancelReasonText,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
