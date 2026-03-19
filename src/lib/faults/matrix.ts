import type { FaultMatrixState } from "@/lib/faults/types";

export function resolveFaultMatrixState({
  wsConnected,
  sseConnected,
}: {
  wsConnected: boolean;
  sseConnected: boolean;
}): FaultMatrixState {
  if (wsConnected && sseConnected) {
    return "healthy";
  }

  if (wsConnected && !sseConnected) {
    return "sse_disconnected";
  }

  if (!wsConnected && sseConnected) {
    return "agent_disconnected";
  }

  return "full_disconnect";
}
