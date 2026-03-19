import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

import { CHAIN_CONFIG } from "@/lib/wallet/config";

export function createBasePublicClient() {
  const chain = CHAIN_CONFIG.CHAIN_ID === 8453 ? base : baseSepolia;
  const primaryTransport = http(process.env.BASE_RPC_URL);
  const fallbackTransport = process.env.BASE_RPC_FALLBACK_URL
    ? http(process.env.BASE_RPC_FALLBACK_URL)
    : undefined;

  return createPublicClient({
    chain,
    transport: fallbackTransport ? fallbackTransport : primaryTransport,
  });
}
