import { z } from "zod";

import { requireCurrentUserId } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import {
  getCurrentUserAccount,
  updateCurrentUserAccount,
} from "@/lib/users/profile";
import { deleteCurrentUserAccount } from "@/lib/users/account";
import {
  createValidationErrorResponse,
  parseJsonBody,
} from "@/lib/validation";

const userUpdateSchema = z
  .object({
    display_name: z.string().trim().min(1).max(30).optional(),
    avatar_url: z.string().trim().url().max(2000).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    locale: z.enum(["en", "zh"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be updated.",
    path: ["root"],
  });

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const profile = await getCurrentUserAccount(userId);

    return Response.json(profile);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = await parseJsonBody(request, userUpdateSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "User profile payload is invalid.");
    }

    const profile = await updateCurrentUserAccount({
      userId,
      payload: body.data,
    });

    return Response.json(profile);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const userId = await requireCurrentUserId();
    const result = await deleteCurrentUserAccount(userId);

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
