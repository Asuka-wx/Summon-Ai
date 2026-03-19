import { createHash, createHmac } from "node:crypto";

import { jwtVerify } from "jose";

import { relayConfig } from "./config.mjs";
import { getRelaySupabaseAdminClient } from "./supabase.mjs";

const apiKeyCache = new Map();

export function compareVersions(left, right) {
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

export function computeSdkIntegrityHash({ agentId, sdkApiKey, sdkVersion }) {
  if (!relayConfig.relaySecret) {
    return "";
  }

  const canonicalPayload = JSON.stringify({
    agent_id: agentId,
    sdk_api_key: sdkApiKey,
    sdk_version: sdkVersion,
  });

  return createHmac("sha256", relayConfig.relaySecret)
    .update(canonicalPayload)
    .digest("hex");
}

export function extractBearerToken(request) {
  const authorization = request.headers.authorization ?? request.headers.get?.("authorization");
  if (!authorization) {
    return null;
  }

  return authorization.replace(/^Bearer\s+/i, "");
}

export function authorizeRelayRequest(request) {
  const token = extractBearerToken(request);

  return Boolean(token && relayConfig.relaySecret && token === relayConfig.relaySecret);
}

export async function verifySseToken(token) {
  if (!token) {
    throw new Error("Missing SSE token.");
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!jwtSecret) {
    return {
      userId: token,
      role: "user",
    };
  }

  const secret = new TextEncoder().encode(jwtSecret);
  const { payload } = await jwtVerify(token, secret, {
    issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
    audience: "authenticated",
  });

  return {
    userId:
      String(payload.sub ?? payload.user_id ?? payload.session_id ?? "anonymous"),
    role: String(payload.role ?? payload.app_metadata?.role ?? "user"),
  };
}

export async function verifyWsApiKey(apiKey) {
  if (!apiKey) {
    throw new Error("AUTH_FAILED");
  }

  const apiKeyHash = createHash("sha256").update(apiKey, "utf8").digest("hex");
  const cached = apiKeyCache.get(apiKeyHash);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const supabase = getRelaySupabaseAdminClient();

  if (!supabase) {
    throw new Error("AUTH_FAILED");
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, owner_id, status, api_key_hash")
    .eq("api_key_hash", apiKeyHash)
    .in("status", ["online", "busy", "retiring"])
    .single();

  if (error || !agent) {
    throw new Error("AUTH_FAILED");
  }

  const value = {
    agentId: agent.id,
    ownerId: agent.owner_id,
    status: agent.status,
    apiKeyHash,
  };

  apiKeyCache.set(apiKeyHash, {
    value,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return value;
}
