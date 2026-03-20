import { setSellerAgentStatus } from "@/lib/seller/agents";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type SellerAgentRetireRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: SellerAgentRetireRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const agent = await setSellerAgentStatus({
      ownerId: currentUser.id,
      agentId: id,
      status: "retiring",
    });

    return Response.json({ agent });
  } catch (error) {
    return toErrorResponse(error);
  }
}
