import { createErrorResponse } from "@/lib/api-error";
import { sendTip } from "@/lib/payments/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskTipRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskTipRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;
    const body = (await request.json()) as {
      amount?: number;
    };

    if (typeof body.amount !== "number") {
      return createErrorResponse(400, "validation_error", "Tip amount is required.", {
        amount: "Expected numeric amount.",
      });
    }

    const result = await sendTip({
      taskId: id,
      userId,
      amount: body.amount,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
