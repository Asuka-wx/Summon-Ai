import { getCurrentUserId } from "@/lib/server/current-user";
import { enforceRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { getSimilarAgents } from "@/lib/recommendations/service";
import { toErrorResponse } from "@/lib/server/route-errors";

type SimilarAgentsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: SimilarAgentsRouteContext) {
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
    const userId = await getCurrentUserId();
    const agents = await getSimilarAgents(id, userId);

    return Response.json({
      agents,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
