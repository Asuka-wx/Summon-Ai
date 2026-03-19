import { createErrorResponse } from "@/lib/api-error";
import { completeAgentRound } from "@/lib/matchmaking/service";
import { toErrorResponse } from "@/lib/server/route-errors";
import { verifySdkSignature } from "@/lib/security/sdk-signature";

type TaskRoundCompleteRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: TaskRoundCompleteRouteContext) {
  const rawBody = await request.text();

  try {
    await verifySdkSignature({
      body: rawBody,
      timestamp: request.headers.get("x-sdk-timestamp"),
      signature: request.headers.get("x-sdk-signature"),
      sdkVersion: request.headers.get("x-sdk-version"),
      authorization: request.headers.get("authorization"),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_EXPIRED") {
      return Response.json(
        {
          code: "REQUEST_EXPIRED",
          message: "SDK request timestamp is outside the 5 minute window.",
        },
        { status: 401 },
      );
    }

    if (error instanceof Error && error.message === "SDK_UPGRADE_REQUIRED") {
      return Response.json(
        {
          code: "SDK_UPGRADE_REQUIRED",
          message: `Please upgrade @summonai/sdk to >= ${process.env.SDK_MIN_VERSION ?? "1.0.0"}`,
        },
        { status: 426 },
      );
    }

    return Response.json(
      {
        code: "SIGNATURE_INVALID",
        message: "SDK signature verification failed",
      },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;
    const body = JSON.parse(rawBody) as {
      roundNumber?: number;
      content?: string;
    };

    if (!body.roundNumber || typeof body.content !== "string") {
      return createErrorResponse(400, "validation_error", "Round completion payload is invalid.", {
        roundNumber: "Expected roundNumber and content.",
      });
    }

    const result = await completeAgentRound({
      taskId: id,
      roundNumber: body.roundNumber,
      content: body.content,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
