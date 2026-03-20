import { getCurrentUserId } from "@/lib/server/current-user";
import { enforceRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { getRecommendedAgentsForUser } from "@/lib/recommendations/service";
import { toErrorResponse } from "@/lib/server/route-errors";

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

    const userId = await getCurrentUserId();
    const result = await getRecommendedAgentsForUser(userId);

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
