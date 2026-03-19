import { relayConfig } from "./config.mjs";
import { getRelaySupabaseAdminClient } from "./supabase.mjs";
import { processSdkMessage } from "./ws-relay.mjs";

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function createPlatformMessage(type, data) {
  return {
    type,
    data,
    ts: Date.now(),
  };
}

function matchesBroadcast(agent, categories, userId) {
  if (agent.owner_id === userId) {
    return false;
  }

  if (agent.status !== "online") {
    return false;
  }

  if (Number(agent.active_tasks ?? 0) >= Number(agent.max_concurrent ?? 1)) {
    return false;
  }

  if (Number(agent.health_score ?? 0) < 60) {
    return false;
  }

  if (agent.quality_status === "hidden") {
    return false;
  }

  if (!categories || categories.length === 0) {
    return true;
  }

  const agentCategories = agent.categories ?? [];
  return categories.some((category) => agentCategories.includes(category));
}

export async function handleRelayAPI(request, response, relayState, auth) {
  if (!auth.authorizeRelayRequest(request)) {
    writeJson(response, 401, {
      error: "unauthorized",
      message: "Missing or invalid relay secret.",
    });
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/relay/status") {
    writeJson(response, 200, {
      status: "ok",
      ...relayState.getRelayStats(),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/relay/poll") {
    const agentId = url.searchParams.get("agentId") ?? "";
    const messages = relayState.drainAgentQueue(agentId);

    writeJson(response, 200, {
      messages,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/relay/respond") {
    const body = await readJsonBody(request);
    const result = await processSdkMessage(body, {
      relayState,
      socket: null,
      agentId: body.agentId ?? "",
    });

    writeJson(response, 202, {
      accepted: true,
      result,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/relay/messages") {
    const body = await readJsonBody(request);
    let delivered = 0;

    if (body.targetAgentId) {
      const socket = relayState.getAgentSocket(body.targetAgentId);
      const message = createPlatformMessage(body.type ?? "relay:message", body);

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(message));
        delivered += 1;
      } else {
        relayState.enqueueAgentMessage(body.targetAgentId, message);
      }
    }

    if (body.targetUserId) {
      delivered += relayState.broadcastToUser(
        body.targetUserId,
        body.type ?? "relay:message",
        body,
      );
    }

    if (body.targetTaskId) {
      delivered += relayState.broadcastToTask(
        body.targetTaskId,
        body.type ?? "relay:message",
        body,
      );
    }

    writeJson(response, 202, {
      accepted: true,
      delivered,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/relay/broadcast") {
    const body = await readJsonBody(request);
    const supabase = getRelaySupabaseAdminClient();

    if (!supabase) {
      writeJson(response, 503, {
        error: "platform_at_capacity",
        message: "Relay database access is not configured.",
      });
      return;
    }

    const { data: agents, error } = await supabase
      .from("agents")
      .select("id, owner_id, categories, status, active_tasks, max_concurrent, health_score, quality_status");

    if (error) {
      writeJson(response, 503, {
        error: "platform_at_capacity",
        message: error.message,
      });
      return;
    }

    const matchingAgents = (agents ?? []).filter((agent) =>
      matchesBroadcast(agent, body.categories ?? [], body.userId),
    );

    const message = createPlatformMessage("broadcast", {
      broadcastId: body.broadcastId,
      prompt: body.prompt,
      categories: body.categories ?? [],
    });

    matchingAgents.forEach((agent) => {
      const socket = relayState.getAgentSocket(agent.id);

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(message));
      } else {
        relayState.enqueueAgentMessage(agent.id, message);
      }
    });

    relayState.scheduleBroadcastWindowClose(
      body.broadcastId,
      () => {
        relayState.broadcastToUser(body.userId, "bid:window_closed", {
          broadcastId: body.broadcastId,
        });
      },
      relayConfig.broadcastWindowSeconds * 1000,
    );

    writeJson(response, 202, {
      accepted: true,
      delivered_agent_ids: matchingAgents.map((agent) => agent.id),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/relay/assign") {
    const body = await readJsonBody(request);
    const socket = relayState.getAgentSocket(body.agentId);
    const message = createPlatformMessage(body.type ?? "task_start", {
      taskId: body.taskId,
      sessionId: body.sessionId,
      conversationHistory: body.conversationHistory,
    });

    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    } else {
      relayState.enqueueAgentMessage(body.agentId, message);
    }

    writeJson(response, 202, {
      accepted: true,
      queued: !(socket && socket.readyState === 1),
    });
    return;
  }

  writeJson(response, 404, {
    error: "not_found",
    message: "Relay route not found.",
  });
}
