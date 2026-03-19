import { getDepositStatus } from "@/lib/payments/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type DepositStatusRouteContext = {
  params: Promise<{
    txHash: string;
  }>;
};

export async function GET(_request: Request, { params }: DepositStatusRouteContext) {
  try {
    await requireCurrentUserId();
    const { txHash } = await params;
    const status = await getDepositStatus(txHash);

    return Response.json(status);
  } catch (error) {
    return toErrorResponse(error);
  }
}
