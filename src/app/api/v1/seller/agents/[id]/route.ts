import { createErrorResponse } from "@/lib/api-error";
import { getSellerAgent, updateSellerAgentProfile } from "@/lib/seller/agents";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

type SellerAgentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: SellerAgentRouteContext,
) {
  try {
    const currentUser = await getCurrentUserProfile();
    const limited = await enforceRateLimit({
      key: currentUser.id,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const { id } = await params;
    const agent = await getSellerAgent(currentUser.id, id);

    return Response.json({
      agent,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: SellerAgentRouteContext,
) {
  try {
    const currentUser = await getCurrentUserProfile();
    const limited = await enforceRateLimit({
      key: currentUser.id,
      prefix: "auth-api",
      maxRequests: 30,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      tagline?: string;
      description?: string;
      categories?: string[];
      supported_languages?: string[];
      price_per_call?: number;
    };

    if (
      body.name === undefined &&
      body.tagline === undefined &&
      body.description === undefined &&
      body.categories === undefined &&
      body.supported_languages === undefined &&
      body.price_per_call === undefined
    ) {
      return createErrorResponse(400, "validation_error", "No agent fields were provided for update.");
    }

    const agent = await updateSellerAgentProfile({
      ownerId: currentUser.id,
      agentId: id,
      payload: body,
    });

    return Response.json({
      agent,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
