import { z } from "zod";

import { createSellerDemo } from "@/lib/seller/demos";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type SellerAgentDemosRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const demoMessageSchema = z.object({
  role: z.enum(["user", "agent"]),
  content: z.string().trim().min(1).max(2000),
});

const createDemoSchema = z.object({
  title: z.string().trim().min(1).max(100),
  messages: z.array(demoMessageSchema).min(1).max(20),
});

export async function POST(request: Request, { params }: SellerAgentDemosRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const body = await parseJsonBody(request, createDemoSchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Seller demo payload is invalid.");
    }

    const { id } = await params;
    const demo = await createSellerDemo({
      ownerId: currentUser.id,
      agentId: id,
      title: body.data.title,
      messages: body.data.messages,
    });

    return Response.json({ demo }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
