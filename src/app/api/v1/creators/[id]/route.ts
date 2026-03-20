import { getCreatorProfile } from "@/lib/creators/service";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";

type CreatorRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: CreatorRouteContext) {
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
    const profile = await getCreatorProfile(id);

    return Response.json(profile);
  } catch (error) {
    return toErrorResponse(error);
  }
}
