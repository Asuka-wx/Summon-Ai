import { z } from "zod";

import { setSellerAgentStatus } from "@/lib/seller/agents";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type SellerAgentToggleRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const toggleAgentSchema = z.object({
  online: z.boolean(),
});

export async function POST(request: Request, { params }: SellerAgentToggleRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const body = await parseJsonBody(request, toggleAgentSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Seller toggle payload is invalid.");
    }

    const { id } = await params;
    const agent = await setSellerAgentStatus({
      ownerId: currentUser.id,
      agentId: id,
      status: body.data.online ? "online" : "offline",
    });

    return Response.json({ agent });
  } catch (error) {
    return toErrorResponse(error);
  }
}
