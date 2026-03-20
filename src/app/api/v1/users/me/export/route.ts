import { exportUserData } from "@/lib/export/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const payload = await exportUserData(userId);

    return Response.json(payload);
  } catch (error) {
    return toErrorResponse(error);
  }
}
