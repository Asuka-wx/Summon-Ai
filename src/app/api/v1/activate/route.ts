import { createErrorResponse } from "@/lib/api-error";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requireCurrentUserId } from "@/lib/server/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const limited = await enforceRateLimit({
      key: userId,
      prefix: "activate-attempts",
      maxRequests: Number(process.env.INVITATION_CODE_MAX_ATTEMPTS ?? 5),
      interval: "1 m",
      message: "Too many activation attempts. Please slow down.",
    });

    if (limited) {
      return limited;
    }

    const { code } = (await request.json()) as {
      code?: string;
    };

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return createErrorResponse(400, "validation_error", "Invitation code is required.", {
        code: "Expected non-empty invitation code.",
      });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("redeem_invitation_code", {
      p_user_id: userId,
      p_code: code.trim(),
    });

    if (error) {
      return createErrorResponse(500, "validation_error", error.message);
    }

    if (data.status === "error") {
      return Response.json(
        {
          code: data.code,
          message: data.message,
        },
        { status: 400 },
      );
    }

    return Response.json(data);
  } catch {
    return createErrorResponse(401, "unauthorized", "Please sign in to continue.");
  }
}
