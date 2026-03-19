import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

export function createSdkSignature({
  body,
  timestamp,
  apiSecret,
}: {
  body: string;
  timestamp: string;
  apiSecret: string;
}) {
  return createHmac("sha256", apiSecret).update(body + timestamp).digest("hex");
}

export async function verifySdkSignature({
  body,
  timestamp,
  signature,
  sdkVersion,
  authorization,
}: {
  body: string;
  timestamp: string | null;
  signature: string | null;
  sdkVersion: string | null;
  authorization: string | null;
}) {
  if (!timestamp || Math.abs(Date.now() - Number(timestamp)) > FIVE_MINUTES_MS) {
    throw new Error("REQUEST_EXPIRED");
  }

  if (!signature) {
    throw new Error("SIGNATURE_INVALID");
  }

  if (!sdkVersion) {
    throw new Error("SDK_UPGRADE_REQUIRED");
  }

  const apiKey = authorization?.replace(/^Bearer\s+/i, "") ?? "";

  if (!apiKey) {
    throw new Error("SIGNATURE_INVALID");
  }

  const apiKeyHash = hashApiKey(apiKey);
  const supabase = createAdminClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, api_key_hash, sdk_version")
    .eq("api_key_hash", apiKeyHash)
    .single();

  if (error || !agent) {
    throw new Error("SIGNATURE_INVALID");
  }

  const expectedSignature = createSdkSignature({
    body,
    timestamp,
    apiSecret: apiKey,
  });

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new Error("SIGNATURE_INVALID");
  }

  const minSdkVersion = process.env.SDK_MIN_VERSION ?? "1.0.0";
  const requestedVersion = sdkVersion.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const minimumVersion = minSdkVersion.split(".").map((part) => Number.parseInt(part, 10) || 0);

  for (let index = 0; index < Math.max(requestedVersion.length, minimumVersion.length); index += 1) {
    const requestedPart = requestedVersion[index] ?? 0;
    const minimumPart = minimumVersion[index] ?? 0;

    if (requestedPart > minimumPart) {
      break;
    }

    if (requestedPart < minimumPart) {
      throw new Error("SDK_UPGRADE_REQUIRED");
    }
  }

  return {
    agentId: agent.id,
    apiKeyHash,
  };
}
