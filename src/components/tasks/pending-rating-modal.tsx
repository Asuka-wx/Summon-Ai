"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type PendingTask = {
  id: string;
  end_reason: string | null;
  agent: {
    id: string;
    name: string;
    tagline: string;
  } | null;
};

const LOCK_KEY = "pending_rating_lock";
const CHANNEL_NAME = "summonai-pending-rating";
const LOCK_TTL_MS = 30_000;

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      title: "待处理评价",
      description: "你有一个刚结束的任务等待评价，最多只会弹出一个，其余任务可在“我的任务”里处理。",
      rating: "评分（1-5）",
      tip: "打赏金额（可选）",
      comment: "评价内容（可选）",
      submit: "提交评价",
      later: "稍后再说",
      submitting: "提交中...",
      failed: "提交失败，请稍后重试。",
    };
  }

  return {
    title: "Pending rating",
    description:
      "One finished task is waiting for your review. Only one prompt is shown at a time. The rest stay in My Tasks.",
    rating: "Rating (1-5)",
    tip: "Tip amount (optional)",
    comment: "Comment (optional)",
    submit: "Submit rating",
    later: "Maybe later",
    submitting: "Submitting...",
    failed: "Submission failed. Please try again.",
  };
}

function hasValidLock() {
  try {
    const raw = window.localStorage.getItem(LOCK_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as { owner: string; timestamp: number };
    return Date.now() - parsed.timestamp < LOCK_TTL_MS;
  } catch {
    return false;
  }
}

export function PendingRatingModal({
  locale,
}: {
  locale: "en" | "zh";
}) {
  const copy = getCopy(locale);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [rating, setRating] = useState("5");
  const [tip, setTip] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ownerId] = useState(() => Math.random().toString(36).slice(2));
  const [isVisible, setIsVisible] = useState(false);

  const currentTask = useMemo(() => pendingTasks[0] ?? null, [pendingTasks]);

  useEffect(() => {
    if (hasValidLock()) {
      return;
    }

    try {
      window.localStorage.setItem(
        LOCK_KEY,
        JSON.stringify({
          owner: ownerId,
          timestamp: Date.now(),
        }),
      );
      const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
      channel?.postMessage({ type: "lock-acquired", ownerId });
      channel?.close();
    } catch {
      // Ignore storage failures.
    }

    return () => {
      try {
        const raw = window.localStorage.getItem(LOCK_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as { owner?: string };
        if (parsed.owner === ownerId) {
          window.localStorage.removeItem(LOCK_KEY);
        }
      } catch {
        // Ignore malformed lock data.
      }
    };
  }, [ownerId]);

  useEffect(() => {
    let mounted = true;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

    async function loadPendingTasks() {
      const result = await fetch("/api/v1/tasks/pending-ratings")
        .then((response) => {
          if (!response.ok) {
            return null;
          }

          return response.json() as Promise<{ tasks?: PendingTask[] }>;
        })
        .catch(() => null);

      if (!mounted || !result?.tasks?.length) {
        return;
      }

      setPendingTasks(result.tasks);
      setIsVisible(true);
    }

    channel?.addEventListener("message", (event) => {
      const payload = event.data as { type?: string; ownerId?: string };
      if (payload.type === "lock-acquired" && payload.ownerId !== ownerId) {
        setIsVisible(false);
      }
    });

    void loadPendingTasks();

    return () => {
      mounted = false;
      channel?.close();
    };
  }, [ownerId]);

  async function submitRating() {
    if (!currentTask) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/tasks/${encodeURIComponent(currentTask.id)}/rate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          rating: Number(rating) || 5,
          tip_amount: Number(tip) || 0,
          comment,
        }),
      });

      if (!response.ok) {
        setErrorMessage(copy.failed);
        return;
      }

      setPendingTasks((current) => current.slice(1));
      setRating("5");
      setTip("");
      setComment("");
      setIsVisible(false);
    } catch {
      setErrorMessage(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!currentTask || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-card/95 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {copy.title}
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-foreground">
          {currentTask.agent?.name ?? "Agent"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {copy.description}
        </p>

        <div className="mt-6 grid gap-4">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.rating}
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          />
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.tip}
            value={tip}
            onChange={(event) => setTip(event.target.value)}
          />
          <textarea
            className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.comment}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={isSubmitting} type="button" onClick={() => void submitRating()}>
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsVisible(false)}>
            {copy.later}
          </Button>
        </div>

        {errorMessage ? (
          <p className="mt-4 text-sm text-muted-foreground">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
