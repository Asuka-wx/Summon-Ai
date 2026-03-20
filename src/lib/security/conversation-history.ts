import type { SupabaseClient } from "@supabase/supabase-js";

import { decrypt } from "@/lib/security/encryption";
import { getTaskEncryptionKey } from "@/lib/security/task-encryption-keys";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConversationMessage = {
  role: "user" | "agent" | "system";
  content: string;
  round_number: number;
  is_free: boolean;
  created_at: string;
};

export type TaskResumePayload = {
  taskId: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
  truncated: boolean;
  truncated_rounds?: number;
};

type TaskMessageRow = {
  round_number: number;
  role: "user" | "agent" | "system";
  content: string;
  is_free: boolean | null;
  created_at: string;
};

const MAX_HISTORY_ROUNDS = 50;
const PRESERVED_HEAD_ROUNDS = 5;
const PRESERVED_TAIL_ROUNDS = 45;
const MAX_HISTORY_BYTES = 512 * 1024;

function createSystemTruncationMessage(omittedRounds: number, roundNumber: number): ConversationMessage {
  return {
    role: "system",
    content: `The following conversation history is truncated. Earlier ${omittedRounds} round(s) have been omitted.`,
    round_number: roundNumber,
    is_free: false,
    created_at: new Date().toISOString(),
  };
}

function toConversationMessage(row: TaskMessageRow, taskKey: Buffer): ConversationMessage {
  return {
    role: row.role,
    content: decrypt(row.content, taskKey),
    round_number: row.round_number,
    is_free: row.is_free ?? false,
    created_at: row.created_at,
  };
}

function serializeHistoryByteLength(history: ConversationMessage[]) {
  return Buffer.byteLength(JSON.stringify(history), "utf8");
}

function trimOversizedPayload(history: ConversationMessage[]) {
  if (serializeHistoryByteLength(history) <= MAX_HISTORY_BYTES) {
    return history;
  }

  return history.map((message) => {
    if (message.role === "system" || message.content.length <= 2_000) {
      return message;
    }

    return {
      ...message,
      content: `${message.content.slice(0, 1_997)}...`,
    };
  });
}

export async function buildConversationHistory(
  taskId: string,
  supabase: SupabaseClient = createAdminClient(),
): Promise<TaskResumePayload> {
  const [{ data: task, error: taskError }, taskKey] = await Promise.all([
    supabase.from("tasks").select("id, session_id").eq("id", taskId).single(),
    getTaskEncryptionKey(taskId, supabase),
  ]);

  if (taskError || !task) {
    throw new Error(`Failed to load task ${taskId}: ${taskError?.message ?? "Not found"}`);
  }

  const { data: rows, error } = await supabase
    .from("task_messages")
    .select("round_number, role, content, is_free, created_at")
    .eq("task_id", taskId)
    .order("round_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load task history for task ${taskId}: ${error.message}`);
  }

  const messages = (rows ?? []).map((row) => toConversationMessage(row as TaskMessageRow, taskKey));
  const roundNumbers = [...new Set(messages.map((message) => message.round_number))];

  if (roundNumbers.length <= MAX_HISTORY_ROUNDS) {
    return {
      taskId: task.id,
      sessionId: task.session_id,
      conversationHistory: trimOversizedPayload(messages),
      truncated: false,
    };
  }

  const headRounds = roundNumbers.slice(0, PRESERVED_HEAD_ROUNDS);
  const tailRounds = roundNumbers.slice(-PRESERVED_TAIL_ROUNDS);
  const omittedRoundCount = Math.max(roundNumbers.length - headRounds.length - tailRounds.length, 0);
  const truncationRound = headRounds.at(-1) ?? 0;

  const truncatedHistory = [
    ...messages.filter((message) => headRounds.includes(message.round_number)),
    createSystemTruncationMessage(omittedRoundCount, truncationRound),
    ...messages.filter((message) => tailRounds.includes(message.round_number)),
  ];

  return {
    taskId: task.id,
    sessionId: task.session_id,
    conversationHistory: trimOversizedPayload(truncatedHistory),
    truncated: true,
    truncated_rounds: omittedRoundCount,
  };
}

export async function getDecryptedTaskMessages(
  taskId: string,
  supabase: SupabaseClient = createAdminClient(),
  options?: {
    afterRound?: number;
  },
) {
  const taskKey = await getTaskEncryptionKey(taskId, supabase);
  let query = supabase
    .from("task_messages")
    .select("id, round_number, role, content, is_free, created_at")
    .eq("task_id", taskId)
    .order("round_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (typeof options?.afterRound === "number" && options.afterRound >= 0) {
    query = query.gt("round_number", options.afterRound);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load encrypted task messages for task ${taskId}: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    ...row,
    content: decrypt(row.content, taskKey),
    is_free: row.is_free ?? false,
  }));
}
