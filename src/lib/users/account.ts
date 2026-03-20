import { getAddress } from "viem";

import { getUserBalanceSummary } from "@/lib/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateUserPayoutWallet({
  userId,
  walletAddress,
}: {
  userId: string;
  walletAddress: string;
}) {
  const supabase = createAdminClient();
  const normalizedAddress = getAddress(walletAddress);
  const cooldownHours = Number(process.env.WALLET_CHANGE_COOLDOWN_HOURS ?? 48);
  const { data: user, error } = await supabase
    .from("users")
    .select("payout_wallet, wallet_change_requested_at")
    .eq("id", userId)
    .single();

  if (error || !user) {
    throw new Error("unauthorized");
  }

  if (
    user.wallet_change_requested_at &&
    Date.now() - new Date(user.wallet_change_requested_at).getTime() <
      cooldownHours * 60 * 60 * 1000
  ) {
    throw new Error("wallet_cooldown_active");
  }

  const changedAt = new Date().toISOString();
  await supabase
    .from("users")
    .update({
      payout_wallet: normalizedAddress,
      payout_chain: "base",
      wallet_change_requested_at: changedAt,
      updated_at: changedAt,
    })
    .eq("id", userId);

  return {
    payout_wallet: normalizedAddress,
    payout_chain: "base",
    wallet_change_requested_at: changedAt,
    available_after: new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString(),
  };
}

export async function deleteCurrentUserAccount(userId: string) {
  const supabase = createAdminClient();
  const [balanceSummary, { count: activeTasks }, { count: activeOwnedAgentTasks }] = await Promise.all([
    getUserBalanceSummary(userId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["confirming", "active", "paused"]),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .gt("active_tasks", 0),
  ]);

  if (Number(balanceSummary.balance ?? 0) > 0) {
    throw new Error("insufficient_balance");
  }

  if ((activeTasks ?? 0) > 0 || (activeOwnedAgentTasks ?? 0) > 0) {
    throw new Error("invalid_task_state");
  }

  const { data: ownedAgents } = await supabase
    .from("agents")
    .select("id")
    .eq("owner_id", userId);
  const { data: ownedTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId);

  if ((ownedAgents ?? []).length > 0) {
    await supabase
      .from("agents")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", userId);
  }

  const taskIds = (ownedTasks ?? []).map((task) => task.id);
  if (taskIds.length > 0) {
    await supabase.from("task_messages").delete().in("task_id", taskIds);
    await supabase.from("task_encryption_keys").delete().in("task_id", taskIds);
  }

  await supabase.from("follows").delete().eq("user_id", userId);
  await supabase.from("notifications").delete().eq("user_id", userId);
  await supabase.from("feedback").delete().eq("user_id", userId);

  await supabase
    .from("users")
    .update({
      display_name: "Deleted User",
      avatar_url: null,
      email: null,
      bio: null,
      wallet_address: null,
      payout_wallet: null,
      twitter_handle: null,
      twitter_verified_at: null,
      github_handle: null,
      github_verified_at: null,
      is_frozen: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  const { data: existingRequest } = await supabase
    .from("data_deletion_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "account_delete")
    .maybeSingle();

  if (existingRequest) {
    await supabase
      .from("data_deletion_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", existingRequest.id);
  } else {
    await supabase.from("data_deletion_requests").insert({
      user_id: userId,
      type: "account_delete",
      status: "completed",
      completed_at: new Date().toISOString(),
    });
  }

  return {
    ok: true,
  };
}
