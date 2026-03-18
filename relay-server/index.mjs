import { createServer } from "node:http";

import * as Sentry from "@sentry/node";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT ?? 8080);
const heartbeatIntervalSeconds = Number(process.env.HEARTBEAT_INTERVAL_SECONDS ?? 15);
const heartbeatIntervalMs = heartbeatIntervalSeconds * 1000;
const heartbeatMissThreshold = Number(process.env.HEARTBEAT_MISS_THRESHOLD ?? 2);
const gracefulShutdownTimeoutMs = Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS ?? 5000);
const healthCheckPath = process.env.FLYIO_HEALTH_CHECK_PATH ?? "/health";
const sdkMinVersion = process.env.SDK_MIN_VERSION ?? "1.0.0";
const wsMaxConnectionsPerIp = Number(process.env.WS_MAX_CONNECTIONS_PER_IP ?? 5);
const maxMessagesPerMinute = 200;

const relayDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const WS_CLOSE_CODES = {
  AUTH_FAILED: 4001,
  INTEGRITY_CHECK_FAILED: 4002,
  SDK_VERSION_TOO_LOW: 4003,
  AGENT_UNAVAILABLE: 4004,
  CONNECTION_LIMIT_EXCEEDED: 4005,
  HEARTBEAT_TIMEOUT: 4006,
  SERVER_MAINTENANCE: 4007,
  SERVER_RESTART: 4008,
  MESSAGE_RATE_LIMITED: 4009,
  NORMAL_CLOSURE: 1000,
};

const activeSockets = new Set();
const agentConnectionCounts = new Map();
const ipConnectionCounts = new Map();
let isShuttingDown = false;

if (relayDsn) {
  Sentry.init({
    dsn: relayDsn,
    sampleRate: 0.5,
    tracesSampleRate: 0.1,
    ignoreErrors: ["AbortError", "Network Error"],
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      return event;
    },
  });
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  return 0;
}

function getClientIp(request) {
  return (
    request.headers["fly-client-ip"] ??
    request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
    request.socket.remoteAddress ??
    "unknown"
  );
}

function writeJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function createRelayError(error, message, details = {}) {
  return Object.keys(details).length > 0 ? { error, message, details } : { error, message };
}

function closeSocket(socket, code, reason) {
  if (socket.readyState < 2) {
    socket.close(code, reason);
  }
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === healthCheckPath) {
    writeJson(response, 200, {
      status: "ok",
      transport: {
        sse: "/sse/*",
        ws: "/ws/*",
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (url.pathname.startsWith("/sse")) {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });

    response.write(`event: sync:ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const heartbeat = setInterval(() => {
      response.write(`event: sync:heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    }, heartbeatIntervalMs);

    request.on("close", () => {
      clearInterval(heartbeat);
      response.end();
    });

    return;
  }

  writeJson(response, 404, createRelayError("not_found", "Resource not found."));
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const sdkApiKey = url.searchParams.get("sdk_api_key");
  const integrityHash = url.searchParams.get("integrity_hash");
  const sdkVersion = url.searchParams.get("sdk_version") ?? "0.0.0";
  const agentId = url.searchParams.get("agent_id") ?? "";
  const clientIp = getClientIp(request);
  const isMaintenanceProbe = url.pathname.startsWith("/ws/maintenance");

  if (!sdkApiKey || sdkApiKey === "invalid") {
    closeSocket(socket, WS_CLOSE_CODES.AUTH_FAILED, "Authentication failed.");
    return;
  }

  if (integrityHash === "invalid") {
    closeSocket(socket, WS_CLOSE_CODES.INTEGRITY_CHECK_FAILED, "SDK integrity check failed.");
    return;
  }

  if (compareVersions(sdkVersion, sdkMinVersion) < 0) {
    closeSocket(socket, WS_CLOSE_CODES.SDK_VERSION_TOO_LOW, "SDK version is too low.");
    return;
  }

  if (!agentId || /^(archived|banned|offline)/i.test(agentId)) {
    closeSocket(socket, WS_CLOSE_CODES.AGENT_UNAVAILABLE, "Agent is unavailable.");
    return;
  }

  if (isMaintenanceProbe) {
    closeSocket(socket, WS_CLOSE_CODES.SERVER_MAINTENANCE, "Server maintenance.");
    return;
  }

  if (isShuttingDown) {
    closeSocket(socket, WS_CLOSE_CODES.SERVER_RESTART, "Server restart.");
    return;
  }

  const existingAgentConnections = agentConnectionCounts.get(agentId) ?? 0;
  const existingIpConnections = ipConnectionCounts.get(clientIp) ?? 0;

  if (existingAgentConnections >= 1 || existingIpConnections >= wsMaxConnectionsPerIp) {
    closeSocket(socket, WS_CLOSE_CODES.CONNECTION_LIMIT_EXCEEDED, "Connection limit exceeded.");
    return;
  }

  agentConnectionCounts.set(agentId, existingAgentConnections + 1);
  ipConnectionCounts.set(clientIp, existingIpConnections + 1);
  activeSockets.add(socket);

  let released = false;
  let lastHeartbeatAt = Date.now();
  let messageTimestamps = [];

  function releaseResources() {
    if (released) {
      return;
    }

    released = true;
    activeSockets.delete(socket);

    const nextAgentCount = Math.max((agentConnectionCounts.get(agentId) ?? 1) - 1, 0);
    if (nextAgentCount === 0) {
      agentConnectionCounts.delete(agentId);
    } else {
      agentConnectionCounts.set(agentId, nextAgentCount);
    }

    const nextIpCount = Math.max((ipConnectionCounts.get(clientIp) ?? 1) - 1, 0);
    if (nextIpCount === 0) {
      ipConnectionCounts.delete(clientIp);
    } else {
      ipConnectionCounts.set(clientIp, nextIpCount);
    }
  }

  const heartbeatWatcher = setInterval(() => {
    const now = Date.now();
    if (now - lastHeartbeatAt > heartbeatIntervalMs * heartbeatMissThreshold) {
      closeSocket(socket, WS_CLOSE_CODES.HEARTBEAT_TIMEOUT, "Heartbeat timeout.");
    }
  }, heartbeatIntervalMs);

  socket.send(
    JSON.stringify({
      type: "ready",
      ts: Date.now(),
      agent_id: agentId,
    }),
  );

  socket.on("message", (payload) => {
    try {
      const parsed = JSON.parse(payload.toString());
      const now = Date.now();

      messageTimestamps = messageTimestamps.filter((timestamp) => now - timestamp < 60_000);
      messageTimestamps.push(now);

      if (messageTimestamps.length > maxMessagesPerMinute) {
        closeSocket(socket, WS_CLOSE_CODES.MESSAGE_RATE_LIMITED, "Message rate limit exceeded.");
        return;
      }

      if (parsed.type === "heartbeat") {
        lastHeartbeatAt = now;
        socket.send(JSON.stringify({ type: "heartbeat_ack", ts: now }));
        return;
      }

      if (parsed.type === "disconnect") {
        closeSocket(socket, WS_CLOSE_CODES.NORMAL_CLOSURE, "Normal closure.");
        return;
      }

      if (parsed.type === "maintenance_probe") {
        closeSocket(socket, WS_CLOSE_CODES.SERVER_MAINTENANCE, "Server maintenance.");
        return;
      }
    } catch (error) {
      Sentry.captureException(error);
      socket.send(JSON.stringify({ type: "error", code: "validation_error" }));
    }
  });

  socket.on("close", () => {
    clearInterval(heartbeatWatcher);
    releaseResources();
  });

  socket.on("error", (error) => {
    Sentry.captureException(error);
    clearInterval(heartbeatWatcher);
    releaseResources();
  });
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (!url.pathname.startsWith("/ws")) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (websocket) => {
    wss.emit("connection", websocket, request);
  });
});

server.listen(port, () => {
  console.log(`SummonAI relay listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down relay gracefully.`);
  isShuttingDown = true;

  for (const socket of activeSockets) {
    closeSocket(socket, WS_CLOSE_CODES.SERVER_RESTART, "Server restart.");
  }

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, gracefulShutdownTimeoutMs).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
