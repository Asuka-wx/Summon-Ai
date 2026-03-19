import { createErrorResponse } from "@/lib/api-error";
import { requestWithdrawal } from "@/lib/payments/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = (await request.json()) as {
      amount?: number;
    };

    if (typeof body.amount !== "number") {
      return createErrorResponse(400, "validation_error", "Withdrawal amount is required.", {
        amount: "Expected numeric amount.",
      });
    }

    const result = await requestWithdrawal({
      userId,
      amount: body.amount,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
