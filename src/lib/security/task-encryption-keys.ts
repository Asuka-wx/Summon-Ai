import type { SupabaseClient } from "@supabase/supabase-js";

import { createTaskKey, decryptTaskKey, encryptTaskKey } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/admin";

type TaskEncryptionKeyRow = {
  task_id: string;
  encrypted_key: string;
};

async function getTaskEncryptionKeyRow(
  taskId: string,
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("task_encryption_keys")
    .select("task_id, encrypted_key")
    .eq("task_id", taskId)
    .single<TaskEncryptionKeyRow>();

  if (error) {
    throw new Error(`Failed to load task encryption key for task ${taskId}: ${error.message}`);
  }

  return data;
}

export async function createTaskEncryptionKey(
  taskId: string,
  supabase: SupabaseClient = createAdminClient(),
) {
  const taskKey = createTaskKey();
  const encryptedTaskKey = encryptTaskKey(taskKey);

  const { error } = await supabase.from("task_encryption_keys").upsert(
    {
      task_id: taskId,
      encrypted_key: encryptedTaskKey,
    },
    {
      onConflict: "task_id",
    },
  );

  if (error) {
    throw new Error(`Failed to create task encryption key for task ${taskId}: ${error.message}`);
  }

  return taskKey;
}

export async function getTaskEncryptionKey(
  taskId: string,
  supabase: SupabaseClient = createAdminClient(),
) {
  const row = await getTaskEncryptionKeyRow(taskId, supabase);

  return decryptTaskKey(row.encrypted_key);
}
