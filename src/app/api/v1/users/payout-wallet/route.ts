import { z } from "zod";

import { enforceRateLimit } from "@/lib/server/rate-limit";
import { updateUserPayoutWallet } from "@/lib/users/account";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

const payoutWalletSchema = z.object({
  wallet_address: z.string().trim().min(1),
});

export async function PUT(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const body = await parseJsonBody(request, payoutWalletSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Payout wallet payload is invalid.");
    }

    const result = await updateUserPayoutWallet({
      userId,
      walletAddress: body.data.wallet_address,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
