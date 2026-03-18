import { WebSocketServer } from "ws";

import { relayConfig } from "./config.mjs";

export function createWSRelay(relayState, auth, getIsShuttingDown) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (socket, request) => {
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

    if (!sdkApiKey || sdkApiKey === "invalid") {
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

    if (relayState.getAgentSocket(agentId) || relayState.getIpConnectionCount(clientIp) >= relayConfig.wsMaxConnectionsPerIp) {
      socket.close(4005, "Connection limit exceeded.");
      return;
    }

    if (getIsShuttingDown()) {
      socket.close(4008, "Server restarting.");
      return;
    }

    relayState.registerAgentSocket(agentId, clientIp, socket);

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
        agent_id: agentId,
        ts: Date.now(),
      }),
    );

    socket.on("message", (payload) => {
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
          relayState.incrementOnlineSeconds(agentId, relayConfig.heartbeatIntervalSeconds);
          socket.send(JSON.stringify({ type: "heartbeat_ack", ts: now }));
          return;
        }

        if (parsed.type === "disconnect") {
          socket.close(1000, "Normal closure.");
          return;
        }

        if (parsed.type === "maintenance_probe") {
          socket.close(4007, "Server maintenance.");
          return;
        }

        if (parsed.task_id && parsed.type === "stream_chunk") {
          relayState.broadcastToTask(parsed.task_id, "agent:chunk", parsed);
          return;
        }

        if (parsed.user_id && parsed.type === "sync_notification") {
          relayState.broadcastToUser(parsed.user_id, "sync:notification", parsed);
        }
      } catch {
        socket.send(JSON.stringify({ type: "error", code: "validation_error" }));
      }
    });

    socket.on("close", () => {
      clearInterval(heartbeatWatcher);
      relayState.unregisterAgentSocket(agentId, clientIp, socket);
    });

    socket.on("error", () => {
      clearInterval(heartbeatWatcher);
      relayState.unregisterAgentSocket(agentId, clientIp, socket);
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
