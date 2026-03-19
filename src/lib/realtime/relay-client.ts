import { relayConfig } from "@/lib/realtime/relay-config";

type RelayMessagePayload = Record<string, unknown>;

async function postRelay(path: string, body: RelayMessagePayload) {
  if (!relayConfig.internalUrl || !relayConfig.secret) {
    throw new Error("Missing relay configuration.");
  }

  const response = await fetch(new URL(path, relayConfig.internalUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${relayConfig.secret}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Relay request failed with ${response.status}.`);
  }

  return response.json();
}

async function getRelay(path: string, searchParams?: Record<string, string>) {
  if (!relayConfig.internalUrl || !relayConfig.secret) {
    throw new Error("Missing relay configuration.");
  }

  const url = new URL(path, relayConfig.internalUrl);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${relayConfig.secret}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Relay request failed with ${response.status}.`);
  }

  return response.json();
}

export function sendRelayMessage(body: RelayMessagePayload) {
  return postRelay("/relay/messages", body);
}

export function broadcastToAgents(body: RelayMessagePayload) {
  return postRelay("/relay/broadcast", body);
}

export function assignTaskToAgent(body: RelayMessagePayload) {
  return postRelay("/relay/assign", body);
}

export function startSellerTestSession(body: RelayMessagePayload) {
  return postRelay("/relay/test/start", body);
}

export function getSellerTestSession(taskId: string) {
  return getRelay("/relay/test/results", { taskId });
}
