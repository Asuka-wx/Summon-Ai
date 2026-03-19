export type FaultType =
  | "mid_reply_disconnect"
  | "idle_disconnect"
  | "consecutive_timeout"
  | "sse_disconnected"
  | "full_disconnect";

export type FaultMatrixState =
  | "healthy"
  | "sse_disconnected"
  | "agent_disconnected"
  | "full_disconnect";

export type AgentFaultEvent = {
  task_id: string;
  round_number?: number;
  fault_type: FaultType;
  message: string;
};
