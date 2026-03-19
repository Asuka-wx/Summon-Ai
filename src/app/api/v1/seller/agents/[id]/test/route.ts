import {
  listAgentTestRuns,
  runPersistedSellerConnectivityTest,
} from "@/lib/seller/tests";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";
import { createAdminClient } from "@/lib/supabase/admin";

type SellerAgentTestRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: SellerAgentTestRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, owner_id")
      .eq("id", id)
      .single();

    if (error || !agent) {
      throw new Error("agent_not_found");
    }

    if (agent.owner_id !== currentUser.id) {
      throw new Error("not_agent_owner");
    }

    const result = await runPersistedSellerConnectivityTest({
      agentId: id,
      ownerId: currentUser.id,
    });

    return Response.json({
      ...result,
      room_href: `/seller/test-room/${result.test_id}`,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(_request: Request, { params }: SellerAgentTestRouteContext) {
  try {
    const currentUser = await getCurrentUserProfile();
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: agent, error } = await supabase
      .from("agents")
      .select("id, owner_id")
      .eq("id", id)
      .single();

    if (error || !agent) {
      throw new Error("agent_not_found");
    }

    if (agent.owner_id !== currentUser.id) {
      throw new Error("not_agent_owner");
    }

    const runs = await listAgentTestRuns({
      ownerId: currentUser.id,
      agentId: id,
    });

    return Response.json({
      runs,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
