import { createServer } from "node:http";

import * as Sentry from "@sentry/node";

import { authorizeRelayRequest, compareVersions, computeSdkIntegrityHash, verifySseToken } from "./auth.mjs";
import { relayConfig } from "./config.mjs";
import { startCronScheduler, flushOnlineStats } from "./cron-scheduler.mjs";
import { cleanupInstanceRoutes } from "./redis.mjs";
import { handleRelayAPI } from "./relay-api.mjs";
import { handleSSERequest, notifyReconnectAndCloseAllSse } from "./sse-server.mjs";
import { createRelayState } from "./state.mjs";
import { createWSRelay, drainWsConnections } from "./ws-relay.mjs";

const relayState = createRelayState();
let isShuttingDown = false;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
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

const auth = {
  authorizeRelayRequest,
  compareVersions,
  computeSdkIntegrityHash,
  verifySseToken,
};

const wsRelay = createWSRelay(relayState, auth, () => isShuttingDown);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === relayConfig.healthCheckPath) {
    const memoryUsageMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(
      JSON.stringify({
        status: "ok",
        activeConnections: relayState.getRelayStats().activeConnections,
        uptime: relayState.getRelayStats().uptimeSeconds,
        memoryUsageMB,
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/sse/")) {
    void handleSSERequest(request, response, relayState, auth);
    return;
  }

  if (url.pathname.startsWith("/relay/")) {
    void handleRelayAPI(request, response, relayState, auth);
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found", message: "Not Found" }));
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (!url.pathname.startsWith("/ws/")) {
    socket.destroy();
    return;
  }

  wsRelay.handleUpgrade(request, socket, head, (websocket) => {
    wsRelay.emit("connection", websocket, request);
  });
});

const stopCronScheduler = startCronScheduler(relayState);

server.listen(relayConfig.port, () => {
  console.log(
    `Relay started on port ${relayConfig.port} (WS=/ws/*, SSE=/sse/*, RELAY=/relay/*)`,
  );
});

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, draining relay connections.`);
  isShuttingDown = true;
  stopCronScheduler();
  await flushOnlineStats(relayState);
  notifyReconnectAndCloseAllSse(relayState);
  drainWsConnections(relayState);
  await cleanupInstanceRoutes(process.env.FLY_ALLOC_ID);

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, relayConfig.gracefulShutdownTimeoutMs).unref();
}

process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
