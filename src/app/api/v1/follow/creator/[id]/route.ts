import { followCreator, unfollowCreator } from "@/lib/follows/service";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type FollowCreatorRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: FollowCreatorRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const { id } = await params;
    const result = await followCreator(userId, id);

    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: FollowCreatorRouteContext) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const { id } = await params;
    const result = await unfollowCreator(userId, id);

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
