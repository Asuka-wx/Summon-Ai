export const SUPPORTED_CHAIN = "base";
export const SUPPORTED_TOKEN = "USDC";
export const WALLET_STACK = {
  rainbowKitVersion: "2.2.5",
  wagmiVersion: "2.19.5",
  viemVersion: "2.38.6",
} as const;

const CHAIN_ENV = process.env.NEXT_PUBLIC_CHAIN_ENV || "testnet";

export const CHAIN_CONFIG =
  CHAIN_ENV === "mainnet"
    ? {
        CHAIN_ID: 8453,
        CHAIN_NAME: "Base Mainnet",
        BLOCK_TIME_MS: 2000,
        USDC_ADDRESS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
        USDC_DECIMALS: 6,
        TRANSFER_EVENT_TOPIC:
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        DEPOSIT_CONFIRMATIONS: Number(process.env.DEPOSIT_CONFIRMATIONS ?? 3),
        HD_DERIVATION_BASE: "m/44'/60'/0'/0",
        DEPOSIT_ADDRESS_INDEX: 0,
        WITHDRAWAL_START_INDEX: 1,
        USDC_TRANSFER_GAS_LIMIT: BigInt(65_000),
        EXPLORER_URL: "https://basescan.org",
      }
    : {
        CHAIN_ID: 84532,
        CHAIN_NAME: "Base Sepolia",
        BLOCK_TIME_MS: 2000,
        USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
        USDC_DECIMALS: 6,
        TRANSFER_EVENT_TOPIC:
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        DEPOSIT_CONFIRMATIONS: 1,
        HD_DERIVATION_BASE: "m/44'/60'/0'/0",
        DEPOSIT_ADDRESS_INDEX: 0,
        WITHDRAWAL_START_INDEX: 1,
        USDC_TRANSFER_GAS_LIMIT: BigInt(65_000),
        EXPLORER_URL: "https://sepolia.basescan.org",
      } as const;

export const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

export const parseUSDC = (amount: number) => BigInt(Math.round(amount * 1e6));
export const formatUSDC = (raw: bigint) => Number(raw) / 1e6;
