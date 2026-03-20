export function createRelayState() {
  const startedAt = Date.now();
  const activeWSConnections = new Set();
  const activeSSEConnections = new Set();
  const agentSockets = new Map();
  const userSSEConnections = new Map();
  const taskSSEConnections = new Map();
  const broadcastSSEConnections = new Map();
  const ipConnectionCounts = new Map();
  const onlineAccumulator = new Map();
  const agentLastHeartbeatAt = new Map();
  const pendingAgentQueues = new Map();
  const streamBuffers = new Map();
  const broadcastWindowTimers = new Map();
  const sellerTestSessions = new Map();
  const sseEventSequences = new Map();
  let maintenanceMode = false;

  function registerAgentSocket(agentId, clientIp, socket) {
    agentSockets.set(agentId, socket);
    activeWSConnections.add(socket);
    ipConnectionCounts.set(clientIp, (ipConnectionCounts.get(clientIp) ?? 0) + 1);
    agentLastHeartbeatAt.set(agentId, Date.now());
  }

  function unregisterAgentSocket(agentId, clientIp, socket) {
    activeWSConnections.delete(socket);

    if (agentSockets.get(agentId) === socket) {
      agentSockets.delete(agentId);
    }

    if (!agentSockets.has(agentId)) {
      agentLastHeartbeatAt.delete(agentId);
    }

    const nextIpCount = Math.max((ipConnectionCounts.get(clientIp) ?? 1) - 1, 0);
    if (nextIpCount === 0) {
      ipConnectionCounts.delete(clientIp);
    } else {
      ipConnectionCounts.set(clientIp, nextIpCount);
    }
  }

  function getAgentSocket(agentId) {
    return agentSockets.get(agentId);
  }

  function enqueueAgentMessage(agentId, message) {
    const queue = pendingAgentQueues.get(agentId) ?? [];
    queue.push({
      ...message,
      queued_at: Date.now(),
    });
    pendingAgentQueues.set(agentId, queue);
  }

  function drainAgentQueue(agentId) {
    const queue = pendingAgentQueues.get(agentId) ?? [];
    pendingAgentQueues.delete(agentId);
    return queue;
  }

  function getIpConnectionCount(clientIp) {
    return ipConnectionCounts.get(clientIp) ?? 0;
  }

  function registerSseConnection({ userId, taskId, broadcastId, response }) {
    activeSSEConnections.add(response);

    if (taskId && userId) {
      const taskKey = `${taskId}:${userId}`;
      const taskConnections = taskSSEConnections.get(taskKey) ?? new Set();
      taskConnections.add(response);
      taskSSEConnections.set(taskKey, taskConnections);
      return;
    }

    if (broadcastId && userId) {
      const broadcastKey = `${broadcastId}:${userId}`;
      const broadcastConnections = broadcastSSEConnections.get(broadcastKey) ?? new Set();
      broadcastConnections.add(response);
      broadcastSSEConnections.set(broadcastKey, broadcastConnections);
      return;
    }

    if (userId) {
      const userConnections = userSSEConnections.get(userId) ?? new Set();
      userConnections.add(response);
      userSSEConnections.set(userId, userConnections);
    }
  }

  function unregisterSseConnection({ userId, taskId, broadcastId, response }) {
    activeSSEConnections.delete(response);

    if (taskId && userId) {
      const taskKey = `${taskId}:${userId}`;
      const taskConnections = taskSSEConnections.get(taskKey);
      taskConnections?.delete(response);
      if (!taskConnections || taskConnections.size === 0) {
        taskSSEConnections.delete(taskKey);
      }
      return;
    }

    if (broadcastId && userId) {
      const broadcastKey = `${broadcastId}:${userId}`;
      const broadcastConnections = broadcastSSEConnections.get(broadcastKey);
      broadcastConnections?.delete(response);
      if (!broadcastConnections || broadcastConnections.size === 0) {
        broadcastSSEConnections.delete(broadcastKey);
      }
      return;
    }

    if (userId) {
      const userConnections = userSSEConnections.get(userId);
      userConnections?.delete(response);
      if (!userConnections || userConnections.size === 0) {
        userSSEConnections.delete(userId);
      }
    }
  }

  function nextSseEventId(scope) {
    const nextSequence = (sseEventSequences.get(scope) ?? 0) + 1;
    sseEventSequences.set(scope, nextSequence);
    return `${scope}:${nextSequence}`;
  }

  function writeSseEvent(response, event, data, retryMs, eventId) {
    if (typeof retryMs === "number") {
      response.write(`retry: ${retryMs}\n`);
    }

    if (eventId) {
      response.write(`id: ${eventId}\n`);
    }

    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  function broadcastToUser(userId, event, data) {
    const targets = userSSEConnections.get(userId);
    if (!targets) {
      return 0;
    }

    const eventId = nextSseEventId(`user:${userId}`);
    targets.forEach((response) => {
      writeSseEvent(response, event, data, undefined, eventId);
    });

    return targets.size;
  }

  function broadcastToTask(taskId, event, data) {
    let deliveredCount = 0;

    for (const [taskKey, targets] of taskSSEConnections.entries()) {
      if (!taskKey.startsWith(`${taskId}:`)) {
        continue;
      }

      const eventId = nextSseEventId(`task:${taskId}`);
      targets.forEach((response) => {
        writeSseEvent(response, event, data, undefined, eventId);
      });

      deliveredCount += targets.size;
    }

    return deliveredCount;
  }

  function broadcastToBroadcast(broadcastId, event, data) {
    let deliveredCount = 0;

    for (const [broadcastKey, targets] of broadcastSSEConnections.entries()) {
      if (!broadcastKey.startsWith(`${broadcastId}:`)) {
        continue;
      }

      const eventId = nextSseEventId(`broadcast:${broadcastId}`);
      targets.forEach((response) => {
        writeSseEvent(response, event, data, undefined, eventId);
      });

      deliveredCount += targets.size;
    }

    return deliveredCount;
  }

  function incrementOnlineSeconds(agentId, seconds) {
    onlineAccumulator.set(agentId, (onlineAccumulator.get(agentId) ?? 0) + seconds);
  }

  function markAgentHeartbeat(agentId) {
    agentLastHeartbeatAt.set(agentId, Date.now());

    for (const session of sellerTestSessions.values()) {
      if (session.agentId === agentId) {
        session.results.heartbeat = true;
        session.updatedAt = Date.now();
      }
    }
  }

  function appendStreamChunk(taskId, content) {
    streamBuffers.set(taskId, `${streamBuffers.get(taskId) ?? ""}${content}`);
  }

  function consumeStreamBuffer(taskId) {
    const content = streamBuffers.get(taskId) ?? "";
    streamBuffers.delete(taskId);
    return content;
  }

  function startSellerTestSession({ taskId, agentId }) {
    const now = Date.now();
    const existing = sellerTestSessions.get(taskId);
    const session = existing ?? {
      taskId,
      agentId,
      startedAt: now,
      updatedAt: now,
      results: {
        self_eval: false,
        streaming: false,
        done_signal: false,
        heartbeat: false,
      },
    };

    session.agentId = agentId;
    session.startedAt = existing?.startedAt ?? now;
    session.updatedAt = now;
    session.results = {
      self_eval: false,
      streaming: false,
      done_signal: false,
      heartbeat:
        agentSockets.has(agentId) ||
        now - (agentLastHeartbeatAt.get(agentId) ?? 0) <= 2 * 60 * 1000,
    };
    sellerTestSessions.set(taskId, session);
    return session;
  }

  function markSellerTestSignal(taskId, signal) {
    const session = sellerTestSessions.get(taskId);
    if (!session) {
      return null;
    }

    session.results[signal] = true;
    session.updatedAt = Date.now();
    return session;
  }

  function getSellerTestSession(taskId) {
    return sellerTestSessions.get(taskId) ?? null;
  }

  function cleanupSellerTestSessions(maxAgeMs = 15 * 60 * 1000) {
    const now = Date.now();

    for (const [taskId, session] of sellerTestSessions.entries()) {
      if (now - session.updatedAt > maxAgeMs) {
        sellerTestSessions.delete(taskId);
      }
    }
  }

  function scheduleBroadcastWindowClose(broadcastId, callback, delayMs) {
    const existingTimer = broadcastWindowTimers.get(broadcastId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      broadcastWindowTimers.delete(broadcastId);
      callback();
    }, delayMs);

    broadcastWindowTimers.set(broadcastId, timer);
  }

  function flushOnlineAccumulatorEntries() {
    const entries = Array.from(onlineAccumulator.entries());
    onlineAccumulator.clear();
    return entries;
  }

  function getRelayStats() {
    return {
      wsConnections: activeWSConnections.size,
      sseConnections: activeSSEConnections.size,
      activeConnections: activeWSConnections.size + activeSSEConnections.size,
      connectedAgents: agentSockets.size,
      trackedUsers: userSSEConnections.size,
      trackedTasks: taskSSEConnections.size,
      trackedBroadcasts: broadcastSSEConnections.size,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      maintenanceMode,
    };
  }

  function setMaintenanceMode(enabled) {
    maintenanceMode = enabled;
  }

  function isMaintenanceMode() {
    return maintenanceMode;
  }

  return {
    registerAgentSocket,
    unregisterAgentSocket,
    getAgentSocket,
    getIpConnectionCount,
    registerSseConnection,
    unregisterSseConnection,
    writeSseEvent,
    nextSseEventId,
    broadcastToUser,
    broadcastToTask,
    broadcastToBroadcast,
    incrementOnlineSeconds,
    markAgentHeartbeat,
    enqueueAgentMessage,
    drainAgentQueue,
    appendStreamChunk,
    consumeStreamBuffer,
    startSellerTestSession,
    markSellerTestSignal,
    getSellerTestSession,
    cleanupSellerTestSessions,
    scheduleBroadcastWindowClose,
    flushOnlineAccumulatorEntries,
    getRelayStats,
    setMaintenanceMode,
    isMaintenanceMode,
    activeWSConnections,
    activeSSEConnections,
  };
}
