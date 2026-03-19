import { getLatestLeaderboardSnapshots } from "@/lib/leaderboards/snapshots";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const snapshots = await getLatestLeaderboardSnapshots();

    return Response.json(snapshots);
  } catch (error) {
    return toErrorResponse(error);
  }
}
