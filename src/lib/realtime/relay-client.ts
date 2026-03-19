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

export function sendRelayMessage(body: RelayMessagePayload) {
  return postRelay("/relay/messages", body);
}

export function broadcastToAgents(body: RelayMessagePayload) {
  return postRelay("/relay/broadcast", body);
}

export function assignTaskToAgent(body: RelayMessagePayload) {
  return postRelay("/relay/assign", body);
}
