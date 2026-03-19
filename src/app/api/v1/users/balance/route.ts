import { getUserBalanceSummary } from "@/lib/payments/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const balance = await getUserBalanceSummary(userId);

    return Response.json(balance);
  } catch (error) {
    return toErrorResponse(error);
  }
}
