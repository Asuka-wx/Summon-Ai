import { listAgentDemos } from "@/lib/agents/catalog";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";

type AgentDemosRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: AgentDemosRouteContext) {
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
    const demos = await listAgentDemos(id);

    return Response.json({
      demos,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
