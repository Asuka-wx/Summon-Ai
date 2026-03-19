import { verifySdkSignature } from "@/lib/security/sdk-signature";

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    const result = await verifySdkSignature({
      body: rawBody,
      timestamp: request.headers.get("x-sdk-timestamp"),
      signature: request.headers.get("x-sdk-signature"),
      sdkVersion: request.headers.get("x-sdk-version"),
      authorization: request.headers.get("authorization"),
    });

    return Response.json({
      ok: true,
      agent_id: result.agentId,
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
}
