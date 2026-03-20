import { getCurrentUserAccount } from "@/lib/users/profile";
import { getDecryptedTaskMessages } from "@/lib/security/conversation-history";
import { createAdminClient } from "@/lib/supabase/admin";

export async function exportTaskConversation({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, user_id, status, phase, created_at, completed_at, agent_id, agents(name)")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) {
    throw new Error("task_not_found");
  }

  if (task.user_id !== userId) {
    throw new Error("not_task_owner");
  }

  if (!task.completed_at || Date.now() - new Date(task.completed_at).getTime() > 24 * 60 * 60 * 1000) {
    throw new Error("conversation_expired");
  }

  const messages = await getDecryptedTaskMessages(taskId, supabase);
  const relatedAgent = task.agents as { name?: string } | Array<{ name?: string }> | null;
  const agentName = Array.isArray(relatedAgent)
    ? relatedAgent[0]?.name ?? task.agent_id
    : relatedAgent?.name ?? task.agent_id;
  const lines = [
    `# Task Export`,
    ``,
    `- Task ID: ${task.id}`,
    `- Agent: ${agentName}`,
    `- Status: ${task.status}`,
    `- Phase: ${task.phase}`,
    `- Created At: ${task.created_at}`,
    `- Completed At: ${task.completed_at}`,
    ``,
    `## Conversation`,
    ``,
    ...messages.flatMap((message) => [
      `### ${message.role} · round ${message.round_number}`,
      ``,
      `${message.content}`,
      ``,
    ]),
  ];

  return lines.join("\n");
}

export async function exportUserData(userId: string) {
  const supabase = createAdminClient();
  const [profile, tasks, ratings, follows, notifications, feedback, deletionRequests] =
    await Promise.all([
      getCurrentUserAccount(userId),
      supabase.from("tasks").select("*").eq("user_id", userId),
      supabase.from("ratings").select("*").eq("user_id", userId),
      supabase.from("follows").select("*").eq("user_id", userId),
      supabase.from("notifications").select("*").eq("user_id", userId),
      supabase.from("feedback").select("*").eq("user_id", userId),
      supabase.from("data_deletion_requests").select("*").eq("user_id", userId),
    ]);

  return {
    exported_at: new Date().toISOString(),
    profile,
    tasks: tasks.data ?? [],
    ratings: ratings.data ?? [],
    follows: follows.data ?? [],
    notifications: notifications.data ?? [],
    feedback: feedback.data ?? [],
    data_requests: deletionRequests.data ?? [],
  };
}
