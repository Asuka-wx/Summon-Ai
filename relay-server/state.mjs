export function createRelayState() {
  const startedAt = Date.now();
  const activeWSConnections = new Set();
  const activeSSEConnections = new Set();
  const agentSockets = new Map();
  const userSSEConnections = new Map();
  const taskSSEConnections = new Map();
  const ipConnectionCounts = new Map();
  const onlineAccumulator = new Map();
  const pendingAgentQueues = new Map();
  const streamBuffers = new Map();
  const broadcastWindowTimers = new Map();

  function registerAgentSocket(agentId, clientIp, socket) {
    agentSockets.set(agentId, socket);
    activeWSConnections.add(socket);
    ipConnectionCounts.set(clientIp, (ipConnectionCounts.get(clientIp) ?? 0) + 1);
  }

  function unregisterAgentSocket(agentId, clientIp, socket) {
    activeWSConnections.delete(socket);

    if (agentSockets.get(agentId) === socket) {
      agentSockets.delete(agentId);
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

  function registerSseConnection({ userId, taskId, response }) {
    activeSSEConnections.add(response);

    if (userId) {
      const userConnections = userSSEConnections.get(userId) ?? new Set();
      userConnections.add(response);
      userSSEConnections.set(userId, userConnections);
    }

    if (taskId && userId) {
      const taskKey = `${taskId}:${userId}`;
      const taskConnections = taskSSEConnections.get(taskKey) ?? new Set();
      taskConnections.add(response);
      taskSSEConnections.set(taskKey, taskConnections);
    }
  }

  function unregisterSseConnection({ userId, taskId, response }) {
    activeSSEConnections.delete(response);

    if (userId) {
      const userConnections = userSSEConnections.get(userId);
      userConnections?.delete(response);
      if (!userConnections || userConnections.size === 0) {
        userSSEConnections.delete(userId);
      }
    }

    if (taskId && userId) {
      const taskKey = `${taskId}:${userId}`;
      const taskConnections = taskSSEConnections.get(taskKey);
      taskConnections?.delete(response);
      if (!taskConnections || taskConnections.size === 0) {
        taskSSEConnections.delete(taskKey);
      }
    }
  }

  function writeSseEvent(response, event, data, retryMs) {
    if (typeof retryMs === "number") {
      response.write(`retry: ${retryMs}\n`);
    }

    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  function broadcastToUser(userId, event, data) {
    const targets = userSSEConnections.get(userId);
    if (!targets) {
      return 0;
    }

    targets.forEach((response) => {
      writeSseEvent(response, event, data);
    });

    return targets.size;
  }

  function broadcastToTask(taskId, event, data) {
    let deliveredCount = 0;

    for (const [taskKey, targets] of taskSSEConnections.entries()) {
      if (!taskKey.startsWith(`${taskId}:`)) {
        continue;
      }

      targets.forEach((response) => {
        writeSseEvent(response, event, data);
      });

      deliveredCount += targets.size;
    }

    return deliveredCount;
  }

  function incrementOnlineSeconds(agentId, seconds) {
    onlineAccumulator.set(agentId, (onlineAccumulator.get(agentId) ?? 0) + seconds);
  }

  function appendStreamChunk(taskId, content) {
    streamBuffers.set(taskId, `${streamBuffers.get(taskId) ?? ""}${content}`);
  }

  function consumeStreamBuffer(taskId) {
    const content = streamBuffers.get(taskId) ?? "";
    streamBuffers.delete(taskId);
    return content;
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
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    };
  }

  return {
    registerAgentSocket,
    unregisterAgentSocket,
    getAgentSocket,
    getIpConnectionCount,
    registerSseConnection,
    unregisterSseConnection,
    writeSseEvent,
    broadcastToUser,
    broadcastToTask,
    incrementOnlineSeconds,
    enqueueAgentMessage,
    drainAgentQueue,
    appendStreamChunk,
    consumeStreamBuffer,
    scheduleBroadcastWindowClose,
    flushOnlineAccumulatorEntries,
    getRelayStats,
    activeWSConnections,
    activeSSEConnections,
  };
}
