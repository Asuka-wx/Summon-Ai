import { getLatestLeaderboardSnapshots } from "@/lib/leaderboards/snapshots";
import { getRequestIp, enforceRateLimit } from "@/lib/server/rate-limit";
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

    const snapshots = await getLatestLeaderboardSnapshots();

    return Response.json(snapshots);
  } catch (error) {
    return toErrorResponse(error);
  }
}
