import { randomUUID } from "node:crypto";

import { SELF_EVAL_TIMEOUT_MS } from "@/lib/protocol/matchmaking";
import {
  getSellerTestSession,
  startSellerTestSession,
} from "@/lib/realtime/relay-client";
import { encrypt } from "@/lib/security/encryption";
import {
  createTaskEncryptionKey,
  getTaskEncryptionKey,
} from "@/lib/security/task-encryption-keys";
import { createAdminClient } from "@/lib/supabase/admin";
import { TASK_PHASE, TASK_STATUS } from "@/lib/tasks/lifecycle";

type PersistedTestResults = {
  self_eval: boolean;
  streaming: boolean;
  done_signal: boolean;
  heartbeat: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function createAgentTestRun({
  ownerId,
  agentId,
  taskId,
}: {
  ownerId: string;
  agentId: string;
  taskId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_test_runs")
    .insert({
      owner_id: ownerId,
      agent_id: agentId,
      task_id: taskId,
      status: "running",
    })
    .select("id, agent_id, task_id, status, self_eval, streaming, done_signal, heartbeat, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  return data;
}

export async function completeAgentTestRun({
  taskId,
  results,
}: {
  taskId: string;
  results: PersistedTestResults;
}) {
  const supabase = createAdminClient();
  const allPassed = Object.values(results).every(Boolean);
  const { data, error } = await supabase
    .from("agent_test_runs")
    .update({
      ...results,
      status: allPassed ? "completed" : "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("task_id", taskId)
    .select("id, agent_id, task_id, status, self_eval, streaming, done_signal, heartbeat, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  return data;
}

export async function listAgentTestRuns({
  ownerId,
  agentId,
}: {
  ownerId: string;
  agentId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_test_runs")
    .select("id, agent_id, task_id, status, self_eval, streaming, done_signal, heartbeat, created_at, updated_at")
    .eq("owner_id", ownerId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error("validation_error");
  }

  return data ?? [];
}

export async function createSellerTestTask({
  ownerId,
  agentId,
}: {
  ownerId: string;
  agentId: string;
}) {
  const supabase = createAdminClient();
  const testPrompt =
    "This is a SummonAI connectivity test. Reply with a short acknowledgement.";
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: ownerId,
      agent_id: agentId,
      session_id: randomUUID(),
      status: TASK_STATUS.ACTIVE,
      phase: TASK_PHASE.PAID,
      is_seed_task: false,
      is_direct: true,
      is_test: true,
      free_rounds: 0,
      locked_price_per_call: 0,
      last_activity_at: new Date().toISOString(),
    })
    .select("id, session_id")
    .single();

  if (error || !task) {
    throw new Error("invalid_task_state");
  }

  await createTaskEncryptionKey(task.id);
  const taskKey = await getTaskEncryptionKey(task.id);
  await supabase.from("task_messages").insert({
    task_id: task.id,
    round_number: 1,
    role: "user",
    type: "text",
    content: encrypt(testPrompt, taskKey),
    is_free: true,
    created_at: new Date().toISOString(),
  });

  await startSellerTestSession({
    agentId,
    taskId: task.id,
    sessionId: task.session_id,
    prompt: testPrompt,
  }).catch(() => {});

  let sampledResults = {
    self_eval: false,
    streaming: false,
    done_signal: false,
    heartbeat: false,
  };
  const pollDeadline = Date.now() + Math.min(9_000, SELF_EVAL_TIMEOUT_MS + 4_000);

  while (Date.now() < pollDeadline) {
    const session = await getSellerTestSession(task.id).catch(() => null);
    const results = session?.results;

    if (results) {
      sampledResults = {
        self_eval: Boolean(results.self_eval),
        streaming: Boolean(results.streaming),
        done_signal: Boolean(results.done_signal),
        heartbeat: Boolean(results.heartbeat),
      };

      if (Object.values(sampledResults).every(Boolean)) {
        break;
      }
    }

    await sleep(1_000);
  }

  return {
    test_id: task.id,
    results: sampledResults,
  };
}

export async function runPersistedSellerConnectivityTest({
  ownerId,
  agentId,
}: {
  ownerId: string;
  agentId: string;
}) {
  const test = await createSellerTestTask({
    ownerId,
    agentId,
  });

  const run = await createAgentTestRun({
    ownerId,
    agentId,
    taskId: test.test_id,
  });

  const finalizedRun = await completeAgentTestRun({
    taskId: test.test_id,
    results: test.results,
  });

  return {
    ...test,
    run_id: run.id,
    run: finalizedRun,
  };
}
