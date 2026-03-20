import { z } from "zod";

import { deleteSellerDemo, updateSellerDemo } from "@/lib/seller/demos";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type SellerAgentDemoRouteContext = {
  params: Promise<{
    id: string;
    demoId: string;
  }>;
};

const demoMessageSchema = z.object({
  role: z.enum(["user", "agent"]),
  content: z.string().trim().min(1).max(2000),
});

const updateDemoSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    messages: z.array(demoMessageSchema).min(1).max(20).optional(),
  })
  .refine((value) => value.title !== undefined || value.messages !== undefined, {
    message: "title or messages is required.",
    path: ["root"],
  });

export async function PATCH(request: Request, { params }: SellerAgentDemoRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const body = await parseJsonBody(request, updateDemoSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Seller demo update payload is invalid.");
    }

    const { id, demoId } = await params;
    const demo = await updateSellerDemo({
      ownerId: currentUser.id,
      agentId: id,
      demoId,
      payload: body.data,
    });

    return Response.json({ demo });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: SellerAgentDemoRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id, demoId } = await params;
    const result = await deleteSellerDemo({
      ownerId: currentUser.id,
      agentId: id,
      demoId,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
