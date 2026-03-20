import { sendNotification } from "@/lib/notifications/service";
import { getUserBalanceSummary, sendTip } from "@/lib/payments/service";
import {
  calculateWeightedAverageRating,
  getRatingWeight,
} from "@/lib/quality/rating";
import { createAdminClient } from "@/lib/supabase/admin";

async function updateAgentRatingAggregate(agentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ratings")
    .select("rating, user_weight")
    .eq("agent_id", agentId);

  if (error) {
    throw new Error("validation_error");
  }

  const ratings = (data ?? []).map((rating) => ({
    rating: Number(rating.rating ?? 0),
    user_weight: Number(rating.user_weight ?? 1),
  }));

  const avgRating = calculateWeightedAverageRating(ratings);

  const { error: updateError } = await supabase
    .from("agents")
    .update({
      avg_rating: avgRating,
      rating_count: ratings.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  if (updateError) {
    throw new Error("validation_error");
  }
}

export async function submitTaskRating({
  taskId,
  userId,
  rating,
  comment,
  tipAmount,
}: {
  taskId: string;
  userId: string;
  rating: number;
  comment?: string;
  tipAmount?: number;
}) {
  const supabase = createAdminClient();
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, user_id, agent_id, status, is_seed_task")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error("task_not_found");
  }

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (!["completed", "cancelled"].includes(task.status)) {
    throw new Error("invalid_task_state");
  }

  const { data: existingRating } = await supabase
    .from("ratings")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();

  if (existingRating) {
    throw new Error("already_rated");
  }

  if ((tipAmount ?? 0) > 0) {
    const balance = await getUserBalanceSummary(userId);

    if (Number(balance.balance ?? 0) < Number(tipAmount ?? 0)) {
      throw new Error("insufficient_balance_for_tip");
    }
  }

  const [{ count: completedTaskCount }, { data: owner }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase.from("agents").select("owner_id").eq("id", task.agent_id).maybeSingle(),
  ]);

  const userWeight = getRatingWeight({
    isSeedTask: Boolean(task.is_seed_task),
    isNewUser: Number(completedTaskCount ?? 0) < 3,
    triggeredAnomaly: false,
  });

  const { data: insertedRating, error: insertError } = await supabase
    .from("ratings")
    .insert({
      task_id: taskId,
      user_id: userId,
      agent_id: task.agent_id,
      rating,
      comment: comment?.trim() || null,
      tip_amount: 0,
      is_seed_task: Boolean(task.is_seed_task),
      user_weight: userWeight,
    })
    .select("id")
    .single();

  if (insertError || !insertedRating) {
    throw new Error("validation_error");
  }

  try {
    if ((tipAmount ?? 0) > 0) {
      await sendTip({
        taskId,
        userId,
        amount: Number(tipAmount),
      });
    }
  } catch (error) {
    await supabase.from("ratings").delete().eq("id", insertedRating.id);
    throw error;
  }

  await updateAgentRatingAggregate(task.agent_id);

  if (owner?.owner_id) {
    void sendNotification(owner.owner_id, "new_rating", {
      task_id: taskId,
      agent_id: task.agent_id,
      rating,
    });
  }

  return {
    rating_id: insertedRating.id,
    task_id: taskId,
    rating,
    tip_amount: Number(tipAmount ?? 0),
  };
}
