import { cancelBroadcast } from "@/lib/matchmaking/service";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type CancelBroadcastRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: CancelBroadcastRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const { id } = await params;

    await cancelBroadcast({
      broadcastId: id,
      userId,
    });

    return Response.json({
      broadcastId: id,
      status: "cancelled",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
