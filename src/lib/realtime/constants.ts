export const REALTIME_PORT = 8080;
export const SSE_PATH_PREFIX = "/sse";
export const WS_PATH_PREFIX = "/ws";
export const SSE_HEARTBEAT_INTERVAL_MS = 30_000;
export const WS_BACKOFF_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000] as const;
