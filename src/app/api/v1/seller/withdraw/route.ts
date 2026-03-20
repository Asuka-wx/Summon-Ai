import { z } from "zod";

import { requestSellerWithdrawal } from "@/lib/payments/service";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  createValidationErrorResponse,
  parseJsonBody,
} from "@/lib/validation";

const sellerWithdrawSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "seller-withdraw",
      maxRequests: 3,
      interval: "1 h",
    });

    if (limited) {
      return limited;
    }

    const body = await parseJsonBody(request, sellerWithdrawSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Seller withdrawal payload is invalid.");
    }

    const result = await requestSellerWithdrawal({
      userId,
      amount: body.data.amount,
    });

    if (!result.ok) {
      return Response.json(
        {
          code: result.code,
          available: result.available,
          frozen: result.frozen,
        },
        { status: 400 },
      );
    }

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
