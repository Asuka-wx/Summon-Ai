import { createAdminClient } from "@/lib/supabase/admin";

async function assertSellerOwnsAgent(ownerId: string, agentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("not_agent_owner");
  }
}

export async function createSellerDemo({
  ownerId,
  agentId,
  title,
  messages,
}: {
  ownerId: string;
  agentId: string;
  title: string;
  messages: Array<{
    role: "user" | "agent";
    content: string;
  }>;
}) {
  const supabase = createAdminClient();
  await assertSellerOwnsAgent(ownerId, agentId);

  const { data: existing } = await supabase
    .from("agent_demos")
    .select("sort_order")
    .eq("agent_id", agentId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("agent_demos")
    .insert({
      agent_id: agentId,
      title: title.trim(),
      messages,
      sort_order: Number(existing?.sort_order ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  return data;
}

export async function updateSellerDemo({
  ownerId,
  agentId,
  demoId,
  payload,
}: {
  ownerId: string;
  agentId: string;
  demoId: string;
  payload: {
    title?: string;
    messages?: Array<{
      role: "user" | "agent";
      content: string;
    }>;
  };
}) {
  const supabase = createAdminClient();
  await assertSellerOwnsAgent(ownerId, agentId);

  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    updates.title = payload.title.trim();
  }

  if (payload.messages !== undefined) {
    updates.messages = payload.messages;
  }

  const { data, error } = await supabase
    .from("agent_demos")
    .update(updates)
    .eq("id", demoId)
    .eq("agent_id", agentId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("not_found");
  }

  return data;
}

export async function deleteSellerDemo({
  ownerId,
  agentId,
  demoId,
}: {
  ownerId: string;
  agentId: string;
  demoId: string;
}) {
  const supabase = createAdminClient();
  await assertSellerOwnsAgent(ownerId, agentId);

  await supabase.from("agent_demos").delete().eq("id", demoId).eq("agent_id", agentId);

  return {
    ok: true,
    id: demoId,
  };
}
