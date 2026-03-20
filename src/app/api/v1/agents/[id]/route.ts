import { getPublicAgentDetail } from "@/lib/agents/catalog";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { getCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type AgentDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: AgentDetailRouteContext) {
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

    const viewerId = await getCurrentUserId();
    const { id } = await params;
    const detail = await getPublicAgentDetail(id, viewerId);

    return Response.json(detail);
  } catch (error) {
    return toErrorResponse(error);
  }
}
