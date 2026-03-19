import { createHash, createHmac } from "node:crypto";

export type SdkIntegrityPayload = {
  agentId: string;
  sdkApiKey: string;
  sdkVersion: string;
};

export function compareSdkVersions(left: string, right: string) {
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

export function computeSdkIntegrityHash(
  payload: SdkIntegrityPayload,
  signingKey: string = payload.sdkApiKey,
) {
  if (!signingKey) {
    throw new Error("Missing SDK signing key.");
  }

  const canonicalPayload = JSON.stringify({
    agent_id: payload.agentId,
    sdk_api_key: payload.sdkApiKey,
    sdk_version: payload.sdkVersion,
  });

  return createHmac("sha256", signingKey).update(canonicalPayload).digest("hex");
}

export function verifySdkIntegrityHash(
  payload: SdkIntegrityPayload,
  integrityHash: string,
  signingKey: string = payload.sdkApiKey,
) {
  return computeSdkIntegrityHash(payload, signingKey) === integrityHash;
}

export function redactConversationContent(value: string) {
  return value.length === 0 ? value : "[REDACTED]";
}

export function createSdkArtifactDigest(source: string) {
  return createHash("sha256").update(source, "utf8").digest("hex");
}
