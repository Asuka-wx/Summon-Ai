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

  if (request.method === "POST" && url.pathname === "/relay/messages") {
    const body = await readJsonBody(request);
    let delivered = 0;

    if (body.targetAgentId) {
      const socket = relayState.getAgentSocket(body.targetAgentId);
      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(body));
        delivered += 1;
      }
    }

    if (body.targetUserId) {
      delivered += relayState.broadcastToUser(body.targetUserId, body.type ?? "relay:message", body);
    }

    if (body.targetTaskId) {
      delivered += relayState.broadcastToTask(body.targetTaskId, body.type ?? "relay:message", body);
    }

    writeJson(response, 202, {
      accepted: true,
      delivered,
    });
    return;
  }

  writeJson(response, 404, {
    error: "not_found",
    message: "Relay route not found.",
  });
}
