import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import WebSocket from "ws";

const SDK_VERSION = "1.0.0";
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000] as const;
const MAX_BID_PITCH_LENGTH = 200;
const API_KEY_SCAN_FILE_PATTERN = /\.(?:js|ts|py|tsx|jsx|ya?ml|env)$/i;
const API_KEY_SCAN_PATTERNS = [
  /SUMMONAI_API_KEY\s*=\s*["']?[A-Za-z0-9._-]{8,}/,
  /apiKey\s*:\s*["'][^"'\r\n]{8,}["']/,
] as const;

type AgentStatus = "online" | "busy" | "retiring";

type PlatformEnvelope<TType extends string, TPayload> = {
  type: TType;
  data: TPayload;
  ts?: number;
};

type RawResumeConversationMessage = {
  role: "user" | "agent" | "system";
  content: string;
  round_number?: number;
  roundNumber?: number;
  created_at?: string;
  createdAt?: string;
};

type PlatformMessage =
  | PlatformEnvelope<"ready", { agentId: string }>
  | PlatformEnvelope<"broadcast", BroadcastPayload>
  | PlatformEnvelope<"task_start", TaskStartPayload>
  | PlatformEnvelope<"task_message", TaskMessagePayload>
  | PlatformEnvelope<"task_stop", TaskStopPayload>
  | PlatformEnvelope<"task_end", TaskEndPayload>
  | PlatformEnvelope<
      "task_resume",
      {
        taskId: string;
        sessionId: string;
        conversationHistory?: RawResumeConversationMessage[];
      }
    >
  | PlatformEnvelope<"heartbeat_ack", Record<string, never>>;

export interface AgentHireConfig {
  agentId: string;
  apiKey: string;
  wsUrl?: string;
  heartbeatIntervalMs?: number;
  selfEvalTimeoutMs?: number;
}

export interface BroadcastPayload {
  broadcastId: string;
  prompt: string;
  categories: string[];
}

export interface SelfEvalResult {
  match: boolean;
  confidence: "high" | "medium" | "low";
  pitch: string;
}

export interface TaskStartPayload {
  taskId: string;
  sessionId: string;
}

export interface TaskMessagePayload {
  taskId: string;
  content: string;
  roundNumber: number;
}

export interface TaskStopPayload {
  taskId: string;
}

export interface TaskEndPayload {
  taskId: string;
}

export interface ConversationMessage {
  role: "user" | "agent" | "system";
  content: string;
  roundNumber: number;
  createdAt: string;
}

export interface TaskResumePayload {
  taskId: string;
  sessionId: string;
  conversationHistory: ConversationMessage[];
}

export interface RoundHelpers {
  sendChunk(content: string): void;
  done(): void;
}

export interface TaskInfo {
  taskId: string;
  status: "active" | "paused";
  startedAt: string;
}

export interface SDKError {
  code: SDKErrorCode;
  message: string;
  retryable: boolean;
}

export type SDKErrorCode =
  | "AUTH_FAILED"
  | "INTEGRITY_MISMATCH"
  | "VERSION_OUTDATED"
  | "MAINTENANCE_MODE"
  | "CONNECTION_LOST"
  | "HEARTBEAT_TIMEOUT"
  | "UNKNOWN";

type BroadcastHandler = (payload: BroadcastPayload) => Promise<SelfEvalResult | null>;
type TaskStartHandler = (payload: TaskStartPayload) => void;
type MessageHandler = (payload: TaskMessagePayload, helpers: RoundHelpers) => Promise<void>;
type TaskStopHandler = (payload: TaskStopPayload) => void;
type TaskEndHandler = (payload: TaskEndPayload) => void;
type TaskResumeHandler = (payload: TaskResumePayload, helpers: RoundHelpers) => Promise<void>;
type ErrorHandler = (error: SDKError) => void;

type ResolvedConfig = AgentHireConfig &
  Required<Pick<AgentHireConfig, "heartbeatIntervalMs" | "selfEvalTimeoutMs">>;

function computeSdkIntegrityHash({
  agentId,
  apiKey,
  sdkVersion,
}: {
  agentId: string;
  apiKey: string;
  sdkVersion: string;
}) {
  const canonicalPayload = JSON.stringify({
    agent_id: agentId,
    sdk_api_key: apiKey,
    sdk_version: sdkVersion,
  });

  return createHmac("sha256", apiKey).update(canonicalPayload).digest("hex");
}

function normalizeConversationHistory(
  history: RawResumeConversationMessage[] | undefined,
) {
  return (history ?? []).map((message: RawResumeConversationMessage) => ({
    role: message.role,
    content: message.content,
    roundNumber: Number(message.roundNumber ?? message.round_number ?? 0),
    createdAt: message.createdAt ?? message.created_at ?? new Date().toISOString(),
  }));
}

function scanForApiKeyLeakage(rootDir: string) {
  const warnings: string[] = [];

  function walk(currentDir: string) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!API_KEY_SCAN_FILE_PATTERN.test(entry.name)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf8");
      if (API_KEY_SCAN_PATTERNS.some((pattern) => pattern.test(content))) {
        warnings.push(fullPath);
      }
    }
  }

  try {
    walk(rootDir);
  } catch {
    return [];
  }

  return warnings;
}

export class AgentHireSDK {
  private readonly config: ResolvedConfig;
  private readonly activeTasks = new Map<string, TaskInfo>();
  private readonly roundNumbers = new Map<string, number>();
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private maintenanceProbeTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private intentionalDisconnect = false;
  private currentStatus: AgentStatus = "online";
  private broadcastHandler: BroadcastHandler | null = null;
  private taskStartHandler: TaskStartHandler | null = null;
  private messageHandler: MessageHandler | null = null;
  private taskStopHandler: TaskStopHandler | null = null;
  private taskEndHandler: TaskEndHandler | null = null;
  private taskResumeHandler: TaskResumeHandler | null = null;
  private errorHandler: ErrorHandler | null = null;

  constructor(config: AgentHireConfig) {
    this.config = {
      wsUrl: "wss://ws.summonai.xyz/ws/sdk/connect",
      heartbeatIntervalMs: 15_000,
      selfEvalTimeoutMs: 8_000,
      ...config,
    };

    for (const filePath of scanForApiKeyLeakage(process.cwd())) {
      if (filePath.endsWith(".env.example")) {
        continue;
      }

      console.warn(
        `WARNING: API Key found in ${path.relative(process.cwd(), filePath)}. Use .env file instead.`,
      );
    }
  }

  async connect() {
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.intentionalDisconnect = false;
    this.stopReconnectLoop();
    this.stopMaintenanceProbe();

    const wsUrl = new URL(this.config.wsUrl ?? "wss://ws.summonai.xyz/ws/sdk/connect");
    wsUrl.searchParams.set("agent_id", this.config.agentId);
    wsUrl.searchParams.set("sdk_api_key", this.config.apiKey);
    wsUrl.searchParams.set("sdk_version", SDK_VERSION);
    wsUrl.searchParams.set(
      "integrity_hash",
      computeSdkIntegrityHash({
        agentId: this.config.agentId,
        apiKey: this.config.apiKey,
        sdkVersion: SDK_VERSION,
      }),
    );

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      let settled = false;

      this.socket = socket;

      socket.on("open", () => {
        settled = true;
        this.reconnectAttempt = 0;
        this.startHeartbeatLoop();
        this.sendSocketMessage("status_update", { status: this.currentStatus });
        resolve();
      });

      socket.on("message", (rawPayload: unknown) => {
        void this.handleMessage(rawPayload);
      });

      socket.on("error", (error: Error) => {
        if (!settled) {
          reject(error);
          settled = true;
        }
      });

      socket.on("close", (code: number) => {
        this.stopHeartbeatLoop();
        if (this.socket === socket) {
          this.socket = null;
        }

        if (!settled) {
          settled = true;
          reject(new Error(`Socket closed before ready: ${code}`));
        }

        this.handleCloseCode(code);
      });
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.stopReconnectLoop();
    this.stopMaintenanceProbe();
    this.stopHeartbeatLoop();
    this.sendSocketMessage("status_update", { status: "offline" });
    this.socket?.close(1_000, "Client disconnect.");
    this.socket = null;
  }

  onBroadcast(handler: BroadcastHandler) {
    this.broadcastHandler = handler;
  }

  onTaskStart(handler: TaskStartHandler) {
    this.taskStartHandler = handler;
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  onTaskStop(handler: TaskStopHandler) {
    this.taskStopHandler = handler;
  }

  onTaskEnd(handler: TaskEndHandler) {
    this.taskEndHandler = handler;
  }

  onTaskResume(handler: TaskResumeHandler) {
    this.taskResumeHandler = handler;
  }

  onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  getActiveTasks() {
    return Array.from(this.activeTasks.values());
  }

  updateStatus(status: AgentStatus) {
    this.currentStatus = status;
    this.sendSocketMessage("status_update", { status });
  }

  handleCloseCode(code: number) {
    if (this.intentionalDisconnect) {
      return;
    }

    if (code === 4_007) {
      this.emitError({
        code: "MAINTENANCE_MODE",
        message: "Platform is under maintenance. Will auto-reconnect when ready.",
        retryable: true,
      });
      this.startMaintenanceProbe();
      return;
    }

    if (code === 4_001) {
      this.emitError({
        code: "AUTH_FAILED",
        message: "Authentication failed.",
        retryable: false,
      });
      return;
    }

    if (code === 4_002) {
      this.emitError({
        code: "INTEGRITY_MISMATCH",
        message: "SDK integrity mismatch detected.",
        retryable: false,
      });
      return;
    }

    if (code === 4_003) {
      this.emitError({
        code: "VERSION_OUTDATED",
        message: "SDK version is outdated.",
        retryable: false,
      });
      return;
    }

    if (code === 4_006) {
      this.emitError({
        code: "HEARTBEAT_TIMEOUT",
        message: "Heartbeat timeout.",
        retryable: true,
      });
      this.scheduleReconnect();
      return;
    }

    this.emitError({
      code: "CONNECTION_LOST",
      message: `Connection closed with code ${code}.`,
      retryable: true,
    });
    this.scheduleReconnect();
  }

  private emitError(error: SDKError) {
    this.errorHandler?.(error);
  }

  private async handleMessage(rawPayload: unknown) {
    let message: PlatformMessage;

    try {
      const payloadText =
        typeof rawPayload === "string"
          ? rawPayload
          : rawPayload instanceof Uint8Array
            ? Buffer.from(rawPayload).toString("utf8")
            : typeof rawPayload === "object" &&
                rawPayload !== null &&
                "toString" in rawPayload &&
                typeof rawPayload.toString === "function"
              ? rawPayload.toString()
              : "";
      message = JSON.parse(payloadText) as PlatformMessage;
    } catch {
      this.emitError({
        code: "UNKNOWN",
        message: "Received an invalid message payload.",
        retryable: true,
      });
      return;
    }

    switch (message.type) {
      case "ready":
      case "heartbeat_ack":
        return;
      case "broadcast":
        await this.handleBroadcast(message.data);
        return;
      case "task_start":
        this.activeTasks.set(message.data.taskId, {
          taskId: message.data.taskId,
          status: "active",
          startedAt: new Date().toISOString(),
        });
        this.taskStartHandler?.(message.data);
        return;
      case "task_message":
        this.roundNumbers.set(message.data.taskId, message.data.roundNumber);
        await this.messageHandler?.(
          message.data,
          this.createRoundHelpers(message.data.taskId, message.data.roundNumber),
        );
        return;
      case "task_stop":
        this.taskStopHandler?.(message.data);
        return;
      case "task_end":
        this.activeTasks.delete(message.data.taskId);
        this.roundNumbers.delete(message.data.taskId);
        this.taskEndHandler?.(message.data);
        return;
      case "task_resume": {
        const normalizedPayload: TaskResumePayload = {
          taskId: message.data.taskId,
          sessionId: message.data.sessionId,
          conversationHistory: normalizeConversationHistory(message.data.conversationHistory),
        };
        const resumedRoundNumber =
          normalizedPayload.conversationHistory.at(-1)?.roundNumber ??
          this.roundNumbers.get(message.data.taskId) ??
          1;

        this.activeTasks.set(message.data.taskId, {
          taskId: message.data.taskId,
          status: "active",
          startedAt: new Date().toISOString(),
        });
        this.roundNumbers.set(message.data.taskId, resumedRoundNumber);
        await this.taskResumeHandler?.(
          normalizedPayload,
          this.createRoundHelpers(message.data.taskId, resumedRoundNumber),
        );
        return;
      }
      default:
        this.emitError({
          code: "UNKNOWN",
          message: `Unhandled platform message type: ${(message as { type: string }).type}`,
          retryable: true,
        });
    }
  }

  private async handleBroadcast(payload: BroadcastPayload) {
    if (!this.broadcastHandler) {
      return;
    }

    let result: SelfEvalResult | null = null;

    try {
      result = await Promise.race([
        this.broadcastHandler(payload),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), this.config.selfEvalTimeoutMs);
        }),
      ]);
    } catch (error) {
      this.emitError({
        code: "UNKNOWN",
        message: error instanceof Error ? error.message : "Broadcast evaluation failed.",
        retryable: true,
      });
      return;
    }

    if (!result?.match) {
      return;
    }

    this.sendSocketMessage("bid", {
      broadcastId: payload.broadcastId,
      confidence: result.confidence,
      pitch: result.pitch.slice(0, MAX_BID_PITCH_LENGTH),
    });
  }

  private createRoundHelpers(taskId: string, roundNumber: number): RoundHelpers {
    let finished = false;

    return {
      sendChunk: (content: string) => {
        if (finished || content.length === 0) {
          return;
        }

        this.roundNumbers.set(taskId, roundNumber);
        this.sendSocketMessage("stream_chunk", {
          taskId,
          content,
        });
      },
      done: () => {
        if (finished) {
          return;
        }

        finished = true;
        this.roundNumbers.set(taskId, roundNumber);
        this.sendSocketMessage("stream_done", {
          taskId,
          roundNumber,
        });
      },
    };
  }

  private sendSocketMessage(type: string, data: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        type,
        data,
        ts: Date.now(),
      }),
    );
  }

  private startHeartbeatLoop() {
    this.stopHeartbeatLoop();
    this.heartbeatTimer = setInterval(() => {
      this.sendSocketMessage("heartbeat", {});
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeatLoop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.intentionalDisconnect || this.maintenanceProbeTimer || this.reconnectTimer) {
      return;
    }

    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, delay);
  }

  private stopReconnectLoop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startMaintenanceProbe() {
    this.stopMaintenanceProbe();

    this.maintenanceProbeTimer = setInterval(() => {
      void this.checkMaintenanceStatus();
    }, 60_000);
  }

  private async checkMaintenanceStatus() {
    try {
      const baseUrl = (this.config.wsUrl ?? "wss://ws.summonai.xyz/ws/sdk/connect")
        .replace(/^wss:/, "https:")
        .replace(/^ws:/, "http:")
        .replace(/\/ws\/.*$/, "");
      const response = await fetch(new URL("/api/admin/maintenance", baseUrl));
      const data = (await response.json()) as { enabled?: boolean };

      if (data.enabled === false) {
        this.stopMaintenanceProbe();
        this.reconnectAttempt = 0;
        void this.connect();
      }
    } catch {
      // Keep probing until maintenance mode is cleared.
    }
  }

  private stopMaintenanceProbe() {
    if (this.maintenanceProbeTimer) {
      clearInterval(this.maintenanceProbeTimer);
      this.maintenanceProbeTimer = null;
    }
  }
}
