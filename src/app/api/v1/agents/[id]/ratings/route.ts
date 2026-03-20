import { z } from "zod";

import { listAgentRatings } from "@/lib/agents/catalog";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  createValidationErrorResponse,
  parseSearchParams,
} from "@/lib/validation";

type AgentRatingsRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const ratingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(request: Request, { params }: AgentRatingsRouteContext) {
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

    const query = parseSearchParams(request, ratingsQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Ratings query is invalid.");
    }

    const { id } = await params;
    const result = await listAgentRatings({
      agentId: id,
      page: query.data.page ?? 1,
      limit: query.data.limit ?? 20,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
