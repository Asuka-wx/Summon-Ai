import { WebSocketServer } from "ws";

import { relayConfig } from "./config.mjs";
import { getRelaySupabaseAdminClient } from "./supabase.mjs";
import { postToVercel } from "./vercel-api.mjs";

async function updateAgentRuntimeState(agentId, updates) {
  const supabase = getRelaySupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("agents")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);
}

async function markAgentDisconnected(agentId) {
  const supabase = getRelaySupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("agents")
    .update({
      status: "offline",
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .not("status", "in", "(retiring,archived)");
}

export async function processSdkMessage(parsed, context) {
  const { relayState, socket, agentId } = context;

  if (parsed.type === "heartbeat") {
    relayState.incrementOnlineSeconds(agentId, relayConfig.heartbeatIntervalSeconds);
    relayState.markAgentHeartbeat(agentId);
    await updateAgentRuntimeState(agentId, {
      sdk_last_heartbeat: new Date().toISOString(),
    }).catch(() => {});
    socket?.send?.(JSON.stringify({ type: "heartbeat_ack", data: {}, ts: Date.now() }));
    return { kind: "heartbeat" };
  }

  if (parsed.type === "disconnect") {
    socket?.close?.(1000, "Normal closure.");
    return { kind: "disconnect" };
  }

  if (parsed.type === "maintenance_probe") {
    socket?.close?.(4007, "Server maintenance.");
    return { kind: "maintenance_probe" };
  }

  if (parsed.type === "bid") {
    if (typeof parsed.data.broadcastId === "string" && parsed.data.broadcastId.startsWith("test-")) {
      relayState.markSellerTestSignal(parsed.data.broadcastId.slice(5), "self_eval");
      return { kind: "test_bid" };
    }

    await postToVercel(`v1/broadcasts/${parsed.data.broadcastId}/bids`, {
      agentId,
      confidence: parsed.data.confidence,
      pitch: parsed.data.pitch,
      response_time_ms: Math.max(0, Date.now() - (parsed.ts ?? Date.now())),
    });

    return { kind: "bid" };
  }

  if (parsed.type === "stream_chunk") {
    relayState.appendStreamChunk(parsed.data.taskId, parsed.data.content);
    relayState.markSellerTestSignal(parsed.data.taskId, "streaming");
    relayState.broadcastToTask(parsed.data.taskId, "agent:chunk", {
      taskId: parsed.data.taskId,
      content: parsed.data.content,
    });
    return { kind: "stream_chunk" };
  }

  if (parsed.type === "stream_done") {
    const bufferedContent = relayState.consumeStreamBuffer(parsed.data.taskId);
    relayState.markSellerTestSignal(parsed.data.taskId, "done_signal");

    const roundResult = await postToVercel(
      `v1/tasks/${parsed.data.taskId}/rounds/complete`,
      {
        roundNumber: parsed.data.roundNumber,
        content: bufferedContent,
      },
    );

    return {
      kind: "stream_done",
      roundResult,
    };
  }

  if (parsed.type === "status_update") {
    await updateAgentRuntimeState(agentId, {
      status: parsed.data.status,
      sdk_last_heartbeat: new Date().toISOString(),
    }).catch(() => {});
    return {
      kind: "status_update",
      status: parsed.data.status,
    };
  }

  return { kind: "unknown" };
}

export function createWSRelay(relayState, auth, getIsShuttingDown) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (socket, request) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const sdkApiKey = url.searchParams.get("sdk_api_key");
    const integrityHash = url.searchParams.get("integrity_hash") ?? "";
    const sdkVersion = url.searchParams.get("sdk_version") ?? "0.0.0";
    const agentId = url.searchParams.get("agent_id") ?? "";
    const clientIp =
      request.headers["fly-client-ip"] ??
      request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
      request.socket.remoteAddress ??
      "unknown";

    try {
      await auth.verifyWsApiKey(sdkApiKey);
    } catch {
      socket.close(4001, "Authentication failed.");
      return;
    }

    if (
      !integrityHash ||
      auth.computeSdkIntegrityHash({ agentId, sdkApiKey, sdkVersion }) !== integrityHash
    ) {
      socket.close(4002, "SDK integrity check failed.");
      return;
    }

    if (auth.compareVersions(sdkVersion, relayConfig.sdkMinVersion) < 0) {
      socket.close(4003, "SDK version is too low.");
      return;
    }

    if (!agentId || /^(archived|banned|offline)/i.test(agentId)) {
      socket.close(4004, "Agent is unavailable.");
      return;
    }

    if (
      relayState.getAgentSocket(agentId) ||
      relayState.getIpConnectionCount(clientIp) >= relayConfig.wsMaxConnectionsPerIp
    ) {
      socket.close(4005, "Connection limit exceeded.");
      return;
    }

    if (getIsShuttingDown()) {
      socket.close(4008, "Server restarting.");
      return;
    }

    if (relayState.isMaintenanceMode()) {
      socket.close(4007, "Server maintenance.");
      return;
    }

    relayState.registerAgentSocket(agentId, clientIp, socket);
    await updateAgentRuntimeState(agentId, {
      sdk_version: sdkVersion,
      sdk_last_heartbeat: new Date().toISOString(),
    }).catch(() => {});
    let currentTaskId = null;
    let currentRoundNumber = null;
    let hasChunksInCurrentRound = false;

    const queuedMessages = relayState.drainAgentQueue(agentId);
    queuedMessages.forEach((message) => {
      socket.send(JSON.stringify(message));
    });

    let lastHeartbeatAt = Date.now();
    let messageTimestamps = [];

    const heartbeatWatcher = setInterval(() => {
      if (
        Date.now() - lastHeartbeatAt >
        relayConfig.heartbeatIntervalSeconds * 1000 * relayConfig.heartbeatMissThreshold
      ) {
        socket.close(4006, "Heartbeat timeout.");
      }
    }, relayConfig.heartbeatIntervalSeconds * 1000);

    socket.send(
      JSON.stringify({
        type: "ready",
        data: { agentId },
        ts: Date.now(),
      }),
    );

    socket.on("message", async (payload) => {
      try {
        const parsed = JSON.parse(payload.toString());
        const now = Date.now();

        messageTimestamps = messageTimestamps.filter((timestamp) => now - timestamp < 60_000);
        messageTimestamps.push(now);

        if (messageTimestamps.length > relayConfig.maxMessagesPerMinute) {
          socket.close(4009, "Message rate limit exceeded.");
          return;
        }

        if (parsed.type === "heartbeat") {
          lastHeartbeatAt = now;
        }

        if (parsed.type === "stream_chunk") {
          currentTaskId = parsed.data.taskId;
          hasChunksInCurrentRound = true;
        }

        if (parsed.type === "stream_done") {
          currentTaskId = parsed.data.taskId;
          currentRoundNumber = parsed.data.roundNumber;
          hasChunksInCurrentRound = false;
        }

        await processSdkMessage(parsed, {
          relayState,
          socket,
          agentId,
        });
      } catch {
        socket.send(JSON.stringify({ type: "error", code: "validation_error" }));
      }
    });

    socket.on("close", () => {
      clearInterval(heartbeatWatcher);

      if (currentTaskId && hasChunksInCurrentRound) {
        relayState.broadcastToTask(currentTaskId, "agent:fault", {
          task_id: currentTaskId,
          round_number: currentRoundNumber ?? undefined,
          fault_type: "mid_reply_disconnect",
          message: "Agent 回复中断开，该轮不计费",
        });
      } else if (currentTaskId) {
        relayState.broadcastToTask(currentTaskId, "agent:disconnect", {
          task_id: currentTaskId,
          grace_seconds: Number(process.env.DISCONNECT_GRACE_SECONDS ?? 60),
        });
      }

      relayState.unregisterAgentSocket(agentId, clientIp, socket);
      void markAgentDisconnected(agentId);
    });

    socket.on("error", () => {
      clearInterval(heartbeatWatcher);
      relayState.unregisterAgentSocket(agentId, clientIp, socket);
      void markAgentDisconnected(agentId);
    });
  });

  return wss;
}

export function drainWsConnections(relayState) {
  for (const socket of relayState.activeWSConnections) {
    if (socket.readyState < 2) {
      socket.close(4008, "Server restarting.");
    }
  }
}
