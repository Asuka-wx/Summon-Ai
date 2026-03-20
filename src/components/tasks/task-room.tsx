"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createTaskEventSource } from "@/lib/realtime/sse-client";

type TaskRoomProps = {
  locale: "en" | "zh";
  taskId: string;
};

type TaskMessage = {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  round_number: number;
  created_at: string;
};

type TaskSnapshot = {
  id: string;
  status: string;
  phase: string;
  round_count: number;
  paid_rounds: number;
  total_charge: number;
  locked_price_per_call: number;
  pause_reason: string | null;
  pause_expires_at: string | null;
  end_reason: string | null;
  agent: {
    id: string;
    name: string;
    tagline: string;
    status: string;
    price_per_call: number;
  } | null;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      statusLabel: "任务状态",
      phaseLabel: "阶段",
      roundsLabel: "回合",
      paidRoundsLabel: "计费回合",
      totalLabel: "费用",
      unitPriceLabel: "单价",
      reasonLabel: "原因",
      confirmTitle: "确认阶段（免费）",
      confirmDescription: "继续使用会切换到正式计费阶段，你也可以在这里结束本次对话。",
      activeTitle: "正式阶段",
      seedTitle: "种子体验",
      pausedTitle: "任务已暂停",
      endedTitle: "任务已结束",
      continuePaid: "继续使用（开始付费）",
      cancelNow: "结束对话",
      pause: "暂停",
      resume: "恢复",
      stop: "停止生成",
      end: "结束任务",
      send: "发送",
      sending: "发送中...",
      inputPlaceholder: "输入下一条消息",
      noMessages: "当前还没有消息。",
      live: "实时输出",
      loadingFailed: "加载失败，请稍后重试。",
      requestFailed: "操作失败，请稍后重试。",
      pauseReasonMap: {
        idle: "空闲超时",
        disconnect_await: "等待 Agent 重连",
        insufficient_balance: "余额不足",
        await_user: "等待用户恢复",
      } as Record<string, string>,
    };
  }

  return {
    statusLabel: "Task status",
    phaseLabel: "Phase",
    roundsLabel: "Rounds",
    paidRoundsLabel: "Paid rounds",
    totalLabel: "Total",
    unitPriceLabel: "Unit price",
    reasonLabel: "Reason",
    confirmTitle: "Confirmation phase (free)",
    confirmDescription:
      "Continue to move into paid usage, or end the conversation here.",
    activeTitle: "Paid phase",
    seedTitle: "Seed trial",
    pausedTitle: "Task paused",
    endedTitle: "Task ended",
    continuePaid: "Continue (start billing)",
    cancelNow: "End conversation",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop generation",
    end: "End task",
    send: "Send",
    sending: "Sending...",
    inputPlaceholder: "Write the next message",
    noMessages: "No messages are available yet.",
    live: "Live output",
    loadingFailed: "Loading failed. Please try again.",
    requestFailed: "Action failed. Please try again.",
    pauseReasonMap: {
      idle: "Idle timeout",
      disconnect_await: "Waiting for agent reconnect",
      insufficient_balance: "Insufficient balance",
      await_user: "Waiting for user resume",
    } as Record<string, string>,
  };
}

export function TaskRoom({ locale, taskId }: TaskRoomProps) {
  const copy = getCopy(locale);
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [task, setTask] = useState<TaskSnapshot | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [liveChunk, setLiveChunk] = useState("");

  const loadTask = useCallback(async () => {
    try {
      const [taskResult, messageResult] = await Promise.all([
        fetch(`/api/v1/tasks/${encodeURIComponent(taskId)}`).then((res) => res.json()),
        fetch(`/api/v1/tasks/${encodeURIComponent(taskId)}/messages`).then((res) => res.json()),
      ]);

      setTask(taskResult);
      setMessages(messageResult.messages ?? []);
    } catch {
      setMessage(copy.loadingFailed);
    }
  }, [copy.loadingFailed, taskId]);

  useEffect(() => {
    void loadTask();
    const interval = window.setInterval(() => {
      void loadTask();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [loadTask]);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    async function connect() {
      eventSource = await createTaskEventSource(taskId);

      if (!eventSource) {
        return;
      }

      eventSource.addEventListener("agent:chunk", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as {
            taskId?: string;
            content?: string;
          };

          if (payload.taskId === taskId || payload.taskId === undefined) {
            setLiveChunk((current) => `${current}${payload.content ?? ""}`);
          }
        } catch {
          // Ignore malformed realtime payloads.
        }
      });

      eventSource.addEventListener("task:round_recorded", () => {
        setLiveChunk("");
        void loadTask();
      });

      eventSource.addEventListener("sync:state_refresh", () => {
        setLiveChunk("");
        void loadTask();
      });
    }

    void connect();

    return () => {
      eventSource?.close();
    };
  }, [loadTask, taskId]);

  async function handleAction(path: string, body?: Record<string, unknown>) {
    setIsActing(true);
    setMessage(null);

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.message ?? copy.requestFailed);
        return;
      }

      await loadTask();
    } catch {
      setMessage(copy.requestFailed);
    } finally {
      setIsActing(false);
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);

    try {
      const response = await fetch(`/api/v1/tasks/${encodeURIComponent(taskId)}/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          content: draft,
        }),
      });

      if (!response.ok) {
        setMessage(copy.requestFailed);
        return;
      }

      setDraft("");
      await loadTask();
    } catch {
      setMessage(copy.requestFailed);
    } finally {
      setIsSending(false);
    }
  }

  const isConfirming = task?.status === "confirming" || task?.phase === "confirmation";
  const isPaused = task?.status === "paused";
  const isEnded = task?.status === "completed" || task?.status === "cancelled";
  const canSend = !isConfirming && !isPaused && !isEnded;
  const statusTitle = isConfirming
    ? copy.confirmTitle
    : task?.phase === "seed"
      ? copy.seedTitle
      : isPaused
        ? copy.pausedTitle
        : isEnded
          ? copy.endedTitle
          : copy.activeTitle;
  const pauseReasonLabel =
    task?.pause_reason ? copy.pauseReasonMap[task.pause_reason] ?? task.pause_reason : null;

  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          {copy.statusLabel}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {statusTitle}
        </h2>
        <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-5">
          <p>{copy.phaseLabel}: {task?.phase ?? "-"}</p>
          <p>{copy.roundsLabel}: {task?.round_count ?? 0}</p>
          <p>{copy.paidRoundsLabel}: {task?.paid_rounds ?? 0}</p>
          <p>{copy.totalLabel}: ${Number(task?.total_charge ?? 0).toFixed(2)}</p>
          <p>{copy.unitPriceLabel}: ${Number(task?.locked_price_per_call ?? 0).toFixed(2)}</p>
        </div>
        {pauseReasonLabel ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {copy.reasonLabel}: {pauseReasonLabel}
          </p>
        ) : null}
        {isConfirming ? (
          <div className="mt-6 rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-sm leading-7 text-muted-foreground">
              {copy.confirmDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={isActing}
                type="button"
                onClick={() =>
                  void handleAction(`/api/v1/tasks/${encodeURIComponent(taskId)}/confirm`, {
                    action: "continue",
                  })
                }
              >
                {copy.continuePaid}
              </Button>
              <Button
                disabled={isActing}
                type="button"
                variant="outline"
                onClick={() =>
                  void handleAction(`/api/v1/tasks/${encodeURIComponent(taskId)}/confirm`, {
                    action: "end",
                  })
                }
              >
                {copy.cancelNow}
              </Button>
            </div>
          </div>
        ) : null}
        {!isConfirming ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {isPaused ? (
              <Button
                disabled={isActing}
                type="button"
                onClick={() => void handleAction(`/api/v1/tasks/${encodeURIComponent(taskId)}/resume`)}
              >
                {copy.resume}
              </Button>
            ) : (
              <Button
                disabled={isActing || isEnded}
                type="button"
                variant="outline"
                onClick={() => void handleAction(`/api/v1/tasks/${encodeURIComponent(taskId)}/pause`)}
              >
                {copy.pause}
              </Button>
            )}
            <Button
              disabled={isActing || isEnded}
              type="button"
              variant="outline"
              onClick={() => void handleAction(`/api/v1/tasks/${encodeURIComponent(taskId)}/stop`)}
            >
              {copy.stop}
            </Button>
            <Button
              disabled={isActing || isEnded}
              type="button"
              variant="outline"
              onClick={() => void handleAction(`/api/v1/tasks/${encodeURIComponent(taskId)}/end`)}
            >
              {copy.end}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noMessages}</p>
          ) : (
            messages.map((messageItem) => (
              <div
                key={messageItem.id}
                className="rounded-3xl border border-border/70 bg-background/75 p-5"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {messageItem.role} · round {messageItem.round_number}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                  {messageItem.content}
                </p>
              </div>
            ))
          )}
          {liveChunk ? (
            <div className="rounded-3xl border border-dashed border-border bg-background/75 p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {copy.live}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{liveChunk}</p>
            </div>
          ) : null}
        </div>
      </div>

      <form
        className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5"
        onSubmit={handleSend}
      >
        <textarea
          className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          placeholder={copy.inputPlaceholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="mt-4 flex items-center gap-3">
          <Button disabled={!canSend || isSending || draft.trim().length === 0} type="submit">
            {isSending ? copy.sending : copy.send}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
