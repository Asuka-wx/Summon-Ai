import { relayConfig } from "./config.mjs";

export async function handleSSERequest(request, response, relayState, auth) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const token = url.searchParams.get("token") ?? "";
  const taskId = url.searchParams.get("task_id");
  const broadcastId = url.searchParams.get("broadcast_id");

  let identity;
  try {
    identity = await auth.verifySseToken(token);
  } catch {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "unauthorized", message: "Invalid SSE token." }));
    return;
  }

  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });

  relayState.registerSseConnection({
    userId: identity.userId,
    taskId,
    broadcastId,
    response,
  });

  relayState.writeSseEvent(
    response,
    "connected",
    {
      ok: true,
      user_id: identity.userId,
      task_id: taskId ?? null,
      broadcast_id: broadcastId ?? null,
    },
    relayConfig.sseRetryMs,
    relayState.nextSseEventId(
      taskId ? `task:${taskId}` : broadcastId ? `broadcast:${broadcastId}` : `user:${identity.userId}`,
    ),
  );

  const heartbeat = setInterval(() => {
    relayState.writeSseEvent(
      response,
      "heartbeat",
      { ts: Date.now() },
      undefined,
      relayState.nextSseEventId(
        taskId ? `task:${taskId}` : broadcastId ? `broadcast:${broadcastId}` : `user:${identity.userId}`,
      ),
    );
  }, relayConfig.sseHeartbeatIntervalSeconds * 1000);

  request.on("close", () => {
    clearInterval(heartbeat);
    relayState.unregisterSseConnection({
      userId: identity.userId,
      taskId,
      broadcastId,
      response,
    });
    response.end();
  });
}

export function notifyReconnectAndCloseAllSse(relayState) {
  for (const response of relayState.activeSSEConnections) {
    relayState.writeSseEvent(response, "reconnect", {});
    response.end();
  }
}
