export interface WSMessage<T extends string = string, D = unknown> {
  type: T;
  data: D;
  ts: number;
}

export interface ConversationMessage {
  role: "user" | "agent" | "system";
  content: string;
  round_number: number;
  is_free: boolean;
  created_at: string;
}

export interface BroadcastData {
  broadcastId: string;
  prompt: string;
  categories: string[];
}

export interface TaskStartData {
  taskId: string;
  sessionId: string;
}

export interface TaskMessageData {
  taskId: string;
  content: string;
  roundNumber: number;
}

export interface TaskStopData {
  taskId: string;
}

export interface TaskEndData {
  taskId: string;
}

export interface TaskResumeData {
  taskId: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
}

export interface BidData {
  broadcastId: string;
  confidence: "high" | "medium" | "low";
  pitch: string;
}

export interface StreamChunkData {
  taskId: string;
  content: string;
}

export interface StreamDoneData {
  taskId: string;
  roundNumber: number;
}

export interface StatusUpdateData {
  status: "online" | "busy" | "retiring";
}

export type PlatformToSDKMessage =
  | WSMessage<"broadcast", BroadcastData>
  | WSMessage<"task_start", TaskStartData>
  | WSMessage<"task_message", TaskMessageData>
  | WSMessage<"task_stop", TaskStopData>
  | WSMessage<"task_end", TaskEndData>
  | WSMessage<"task_resume", TaskResumeData>
  | WSMessage<"heartbeat_ack", Record<string, never>>;

export type SDKToPlatformMessage =
  | WSMessage<"bid", BidData>
  | WSMessage<"stream_chunk", StreamChunkData>
  | WSMessage<"stream_done", StreamDoneData>
  | WSMessage<"heartbeat", Record<string, never>>
  | WSMessage<"status_update", StatusUpdateData>;

export type SseEventName =
  | "connected"
  | "heartbeat"
  | "bid:new"
  | "bid:window_closed"
  | "task:assigned"
  | "task:phase_changed"
  | "task:round_recorded"
  | "task:paused"
  | "task:pause_expired"
  | "task:balance_insufficient"
  | "task:balance_recharged"
  | "task:idle_warning"
  | "agent:chunk"
  | "agent:fault"
  | "agent:disconnect"
  | "agent:reconnect"
  | "agent:disconnect_choice"
  | "agent:resumed_task"
  | "sync:input_lock"
  | "sync:input_unlock"
  | "sync:navigate"
  | "sync:state_refresh"
  | "system:message";

export const BROADCAST_WINDOW_SECONDS = 20;
export const SELF_EVAL_TIMEOUT_MS = 8_000;
export const MAX_BID_PITCH_LENGTH = 200;
export const FREE_ROUNDS = 3;
export const CONVERSATION_HISTORY_MAX_ITEMS = 50;
export const CONVERSATION_HISTORY_MAX_BYTES = 512 * 1024;
