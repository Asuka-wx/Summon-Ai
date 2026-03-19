import { relayConfig } from "./config.mjs";

function buildVercelApiUrl(path) {
  const base = relayConfig.vercelApiUrl.endsWith("/")
    ? relayConfig.vercelApiUrl
    : `${relayConfig.vercelApiUrl}/`;

  return new URL(path, base).toString();
}

export async function postToVercel(path, body) {
  const response = await fetch(buildVercelApiUrl(path), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${relayConfig.cronSecret}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Vercel API ${path} failed with ${response.status}.`);
  }

  return response.json();
}
