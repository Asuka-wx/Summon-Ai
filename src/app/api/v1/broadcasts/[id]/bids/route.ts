import { createErrorResponse } from "@/lib/api-error";
import { recordBid } from "@/lib/matchmaking/service";
import { buildAuthenticatedSseUrl } from "@/lib/realtime/sse-url";
import { isInternalRelayRequest } from "@/lib/server/internal-auth";
import { toErrorResponse } from "@/lib/server/route-errors";

type BroadcastBidRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: BroadcastBidRouteContext) {
  try {
    const { id } = await params;
    const url = await buildAuthenticatedSseUrl({
      broadcastId: id,
    });

    return Response.redirect(url, 307);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: BroadcastBidRouteContext) {
  if (!isInternalRelayRequest(request)) {
    return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      agentId?: string;
      confidence?: "high" | "medium" | "low";
      pitch?: string;
      response_time_ms?: number;
    };

    if (!body.agentId || !body.confidence || !body.pitch) {
      return createErrorResponse(400, "validation_error", "Bid payload is invalid.", {
        confidence: "Expected agentId, confidence and pitch.",
      });
    }

    const result = await recordBid({
      broadcastId: id,
      agentId: body.agentId,
      confidence: body.confidence,
      pitch: body.pitch,
      responseTimeMs: body.response_time_ms ?? 0,
    });

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
