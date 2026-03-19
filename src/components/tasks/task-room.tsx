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

export function TaskRoom({ locale, taskId }: TaskRoomProps) {
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [status, setStatus] = useState<string>("active");
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [liveChunk, setLiveChunk] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const result = await fetch(`/api/v1/tasks/${encodeURIComponent(taskId)}/messages`).then((res) => res.json());
      setMessages(result.messages ?? []);
      setStatus(result.status ?? "active");
    } catch {
      setMessage(locale === "zh" ? "加载失败，请稍后重试。" : "Loading failed. Please try again.");
    }
  }, [locale, taskId]);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => {
      void loadMessages();
    }, 2000);

    return () => clearInterval(interval);
  }, [loadMessages]);

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
        void loadMessages();
      });

      eventSource.addEventListener("sync:state_refresh", () => {
        setLiveChunk("");
        void loadMessages();
      });
    }

    void connect();

    return () => {
      eventSource?.close();
    };
  }, [loadMessages, taskId]);

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
        setMessage(locale === "zh" ? "发送失败，请稍后重试。" : "Send failed. Please try again.");
        return;
      }

      setDraft("");
      await loadMessages();
    } catch {
      setMessage(locale === "zh" ? "发送失败，请稍后重试。" : "Send failed. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          {locale === "zh" ? "任务状态" : "Task status"}
        </p>
        <p className="mt-3 text-sm text-foreground">{status}</p>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="space-y-4">
          {messages.map((messageItem) => (
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
          ))}
          {liveChunk ? (
            <div className="rounded-3xl border border-dashed border-border bg-background/75 p-5">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                live agent chunk
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{liveChunk}</p>
            </div>
          ) : null}
        </div>
      </div>

      <form className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5" onSubmit={handleSend}>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
          placeholder={locale === "zh" ? "输入下一条消息" : "Write the next message"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="mt-4 flex items-center gap-3">
          <Button disabled={isSending || draft.trim().length === 0} type="submit">
            {isSending ? (locale === "zh" ? "发送中..." : "Sending...") : locale === "zh" ? "发送" : "Send"}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
