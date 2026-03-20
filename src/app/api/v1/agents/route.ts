import { z } from "zod";

import { listPublicAgents } from "@/lib/agents/catalog";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  createValidationErrorResponse,
  parseSearchParams,
} from "@/lib/validation";

const agentListQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).optional(),
  section: z.enum(["hot", "new", "top", "rising", "free"]).optional(),
  sort: z.enum(["rating", "newest", "price_asc", "price_desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request) {
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

    const query = parseSearchParams(request, agentListQuerySchema);

    if (!query.success) {
      return createValidationErrorResponse(query.error, "Agent list query is invalid.");
    }

    const agents = await listPublicAgents(query.data);

    return Response.json({
      agents,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
