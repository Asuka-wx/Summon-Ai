import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export type ConversationCleanupResult = {
  deletedTaskIds: string[];
  deletedMessageCount: number;
  deletedKeyCount: number;
};

export async function cleanupExpiredConversations(
  supabase: SupabaseClient = createAdminClient(),
) {
  const deleteAfterHours = Number(process.env.CONVERSATION_DELETE_HOURS ?? 24);
  const cutoff = new Date(Date.now() - deleteAfterHours * 60 * 60 * 1000).toISOString();

  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("status", "completed")
    .eq("has_report", false)
    .lt("completed_at", cutoff);

  if (taskError) {
    throw new Error(`Failed to list expired conversations: ${taskError.message}`);
  }

  const taskIds = (tasks ?? []).map((task) => task.id);

  if (taskIds.length === 0) {
    return {
      deletedTaskIds: [],
      deletedMessageCount: 0,
      deletedKeyCount: 0,
    } satisfies ConversationCleanupResult;
  }

  const [{ error: messagesError }, { error: keysError }] = await Promise.all([
    supabase.from("task_messages").delete().in("task_id", taskIds),
    supabase.from("task_encryption_keys").delete().in("task_id", taskIds),
  ]);

  if (messagesError) {
    throw new Error(`Failed to delete expired task messages: ${messagesError.message}`);
  }

  if (keysError) {
    throw new Error(`Failed to delete expired task keys: ${keysError.message}`);
  }

  return {
    deletedTaskIds: taskIds,
    deletedMessageCount: taskIds.length,
    deletedKeyCount: taskIds.length,
  } satisfies ConversationCleanupResult;
}
