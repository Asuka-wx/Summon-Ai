import { createErrorResponse } from "@/lib/api-error";
import { validateAndConfirmDeposit } from "@/lib/payments/service";
import type { DepositRequest } from "@/lib/payments/types";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "deposit-post",
      maxRequests: 10,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const body = (await request.json()) as DepositRequest;

    if (!body.tx_hash || !body.from_address) {
      return createErrorResponse(400, "validation_error", "Deposit payload is invalid.", {
        tx_hash: "Expected tx_hash and from_address.",
      });
    }

    const result = await validateAndConfirmDeposit({
      txHash: body.tx_hash,
      fromAddress: body.from_address,
      userId,
    });

    return Response.json(result, {
      status:
        result.status === "pending" || result.status === "confirming" ? 202 : 200,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
