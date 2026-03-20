import { getGasStatus } from "@/lib/payments/service";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";

export async function GET() {
  try {
    await requireAdminSession();
    const gasStatus = await getGasStatus();

    return Response.json(gasStatus);
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
