import { z } from "zod";

import { createBroadcast } from "@/lib/matchmaking/service";
import { enforceBroadcastCaptcha } from "@/lib/security/captcha-policy";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  createValidationErrorResponse,
  parseJsonBody,
} from "@/lib/validation";

const createBroadcastSchema = z.object({
  prompt: z.string().trim().min(10).max(2000),
  categories: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  captcha_token: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserProfile();
    const globalLimited = await enforceRateLimit({
      key: "global",
      prefix: "broadcast-global",
      maxRequests: Number(process.env.GLOBAL_BROADCAST_RATE_LIMIT ?? 200),
      interval: "1 m",
      message: "Platform broadcast capacity has been reached. Please try again shortly.",
    });

    if (globalLimited) {
      return globalLimited;
    }

    const limited = await enforceRateLimit({
      key: currentUser.id,
      prefix: "broadcast-post",
      maxRequests: 5,
      interval: "1 m",
    });

    if (limited) {
      return limited;
    }

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const body = await parseJsonBody(request, createBroadcastSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Broadcast payload is invalid.");
    }

    await enforceBroadcastCaptcha({
      userId: currentUser.id,
      captchaToken: body.data.captcha_token,
    });

    const broadcast = await createBroadcast({
      userId: currentUser.id,
      prompt: body.data.prompt,
      categories: body.data.categories ?? [],
    });

    return Response.json({
      broadcastId: broadcast.id,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
