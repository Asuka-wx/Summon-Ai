import { createErrorResponse } from "@/lib/api-error";
import { setSellerAgentStatus } from "@/lib/seller/agents";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type SellerAgentStatusRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: SellerAgentStatusRouteContext,
) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const body = (await request.json()) as {
      status?: "online" | "offline" | "retiring" | "archived";
    };

    if (!body.status || !["online", "offline", "retiring", "archived"].includes(body.status)) {
      return createErrorResponse(400, "validation_error", "Agent status must be online, offline, retiring, or archived.", {
        status: "Expected one of online, offline, retiring, archived.",
      });
    }

    const agent = await setSellerAgentStatus({
      ownerId: currentUser.id,
      agentId: id,
      status: body.status,
    });

    return Response.json({
      agent,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
