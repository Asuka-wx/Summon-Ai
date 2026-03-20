import { listUserBadges } from "@/lib/badges/service";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";

type CreatorBadgesRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: CreatorBadgesRouteContext) {
  try {
    const limited = await enforceRateLimit({
      key: getRequestIp(request),
      prefix: "public-api",
      maxRequests: 60,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const { id } = await params;
    const badges = await listUserBadges(id);

    return Response.json({
      badges,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
