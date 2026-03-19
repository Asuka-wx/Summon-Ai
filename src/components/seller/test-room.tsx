"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { createTaskEventSource } from "@/lib/realtime/sse-client";

type SellerTestRoomProps = {
  locale: "en" | "zh";
  taskId: string;
};

type MessageRecord = {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  round_number: number;
  created_at: string;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      refresh: "刷新消息",
      send: "发送测试消息",
      sending: "发送中...",
      inputPlaceholder: "输入一条新的测试消息",
      empty: "当前还没有可显示的消息。",
      failed: "加载或发送失败，请稍后重试。",
    };
  }

  return {
    refresh: "Refresh messages",
    send: "Send test message",
    sending: "Sending...",
    inputPlaceholder: "Enter a new test message",
    empty: "No messages are available yet.",
    failed: "Loading or sending failed. Please try again.",
  };
}

export function SellerTestRoom({ locale, taskId }: SellerTestRoomProps) {
  const copy = getCopy(locale);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [liveChunk, setLiveChunk] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const result = await fetch(`/api/v1/seller/tasks/${encodeURIComponent(taskId)}/messages`).then(
        (res) => res.json(),
      );
      setMessages(result.messages ?? []);
    } catch {
      setMessage(copy.failed);
    }
  }, [copy.failed, taskId]);

  useEffect(() => {
    void loadMessages();
    const interval = setInterval(() => {
      void loadMessages();
    }, 3000);

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
    setMessage(null);

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
        setMessage(copy.failed);
        return;
      }

      setDraft("");
      await loadMessages();
    } catch {
      setMessage(copy.failed);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => void loadMessages()}>
          {copy.refresh}
        </Button>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
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
                live agent chunk
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
          <Button disabled={isSending || draft.trim().length === 0} type="submit">
            {isSending ? copy.sending : copy.send}
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
