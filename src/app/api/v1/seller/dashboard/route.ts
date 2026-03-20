import { getSellerDashboard } from "@/lib/seller/dashboard";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const currentUser = await getCurrentUserProfile();
    const dashboard = await getSellerDashboard(currentUser.id);

    return Response.json(dashboard);
  } catch (error) {
    return toErrorResponse(error);
  }
}
