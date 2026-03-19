import { getPublicAgentDetail } from "@/lib/agents/catalog";
import { getCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type AgentDetailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: AgentDetailRouteContext) {
  try {
    const viewerId = await getCurrentUserId();
    const { id } = await params;
    const detail = await getPublicAgentDetail(id, viewerId);

    return Response.json(detail);
  } catch (error) {
    return toErrorResponse(error);
  }
}
