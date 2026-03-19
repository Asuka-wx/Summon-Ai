import { listPublicAgents } from "@/lib/agents/catalog";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const agents = await listPublicAgents();

    return Response.json({
      agents,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
