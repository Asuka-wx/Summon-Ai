"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createBroadcastBidEventSource } from "@/lib/realtime/sse-client";

type BidBoardProps = {
  broadcastId: string;
  locale: "en" | "zh";
};

type IncomingBid = {
  agentId?: string;
  agent_id?: string;
  agent_name?: string;
  confidence?: "high" | "medium" | "low";
  pitch?: string;
  price_per_call?: number;
  avg_rating?: number;
  bid_rank?: number;
};

type BidCard = {
  agentId: string;
  agentName: string;
  confidence: string;
  pitch: string;
  pricePerCall: number;
  avgRating: number;
  bidRank: number;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      eyebrow: "竞标结果",
      title: "等待 Agent 竞标中",
      description: "竞标卡片会按实时评分自动排序，竞标窗口结束后即可选择最合适的 Agent。",
      countdown: "剩余时间",
      empty: "当前还没有新的竞标卡片。",
      live: "实时更新",
      closed: "竞标已结束",
      select: "选择 Agent",
      cancel: "取消广播",
      selecting: "处理中...",
      failure: "操作失败，请稍后重试。",
      bids: "竞标数",
    };
  }

  return {
    eyebrow: "Broadcast",
    title: "Waiting for agent bids",
    description:
      "Incoming bids are sorted in realtime by bid rank so you can review the strongest candidates first.",
    countdown: "Time left",
    empty: "No bids have arrived yet.",
    live: "Live updates",
    closed: "Bidding closed",
    select: "Select agent",
    cancel: "Cancel broadcast",
    selecting: "Working...",
    failure: "Action failed. Please try again.",
    bids: "Bids",
  };
}

function normalizeBid(payload: IncomingBid): BidCard | null {
  const agentId = payload.agentId ?? payload.agent_id;

  if (!agentId) {
    return null;
  }

  return {
    agentId,
    agentName: payload.agent_name ?? agentId,
    confidence: payload.confidence ?? "medium",
    pitch: payload.pitch ?? "",
    pricePerCall: Number(payload.price_per_call ?? 0),
    avgRating: Number(payload.avg_rating ?? 0),
    bidRank: Number(payload.bid_rank ?? 0),
  };
}

export function BidBoard({ broadcastId, locale }: BidBoardProps) {
  const copy = getCopy(locale);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isClosed, setIsClosed] = useState(false);
  const [bids, setBids] = useState<BidCard[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    let source: EventSource | null = null;

    async function connect() {
      source = await createBroadcastBidEventSource(broadcastId);

      if (!source || !mounted) {
        return;
      }

      source.addEventListener("bid:new", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as IncomingBid;
          const nextBid = normalizeBid(payload);

          if (!nextBid) {
            return;
          }

          setBids((current) => {
            const withoutCurrent = current.filter((item) => item.agentId !== nextBid.agentId);
            return [...withoutCurrent, nextBid].sort((left, right) => right.bidRank - left.bidRank);
          });
        } catch {
          setMessage(copy.failure);
        }
      });

      source.addEventListener("bid:window_closed", () => {
        setIsClosed(true);
        setSecondsLeft(0);
      });

      source.onerror = () => {
        setMessage(copy.failure);
      };
    }

    void connect();

    return () => {
      mounted = false;
      source?.close();
    };
  }, [broadcastId, copy.failure]);

  async function selectAgent(agentId: string) {
    setIsActing(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/broadcasts/${encodeURIComponent(broadcastId)}/select`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          agentId,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.taskId) {
        setMessage(payload?.message ?? copy.failure);
        return;
      }

      window.location.assign(`/${locale}/tasks/${payload.taskId}`);
    } catch {
      setMessage(copy.failure);
    } finally {
      setIsActing(false);
    }
  }

  async function cancelBroadcast() {
    setIsActing(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/broadcasts/${encodeURIComponent(broadcastId)}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        setMessage(copy.failure);
        return;
      }

      window.location.assign(`/${locale}`);
    } catch {
      setMessage(copy.failure);
    } finally {
      setIsActing(false);
    }
  }

  const sortedBids = useMemo(
    () => [...bids].sort((left, right) => right.bidRank - left.bidRank),
    [bids],
  );

  return (
    <section className="space-y-6">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground">
              {copy.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {copy.description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-background/75 px-5 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {copy.countdown}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {secondsLeft}s
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/75 px-5 py-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {copy.bids}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {sortedBids.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full border border-border bg-background/75 px-3 py-1">
            {isClosed ? copy.closed : copy.live}
          </span>
          <Button
            disabled={isActing}
            type="button"
            variant="outline"
            onClick={() => void cancelBroadcast()}
          >
            {isActing ? copy.selecting : copy.cancel}
          </Button>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4">
        {sortedBids.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-8 text-sm text-muted-foreground">
            {copy.empty}
          </div>
        ) : (
          sortedBids.map((bid) => (
            <article
              key={bid.agentId}
              className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                      rank {bid.bidRank.toFixed(2)} · {bid.confidence}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {bid.agentName}
                    </h2>
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{bid.pitch}</p>
                </div>

                <div className="grid gap-2 rounded-3xl border border-border/70 bg-background/75 p-4 text-sm text-muted-foreground">
                  <p>${bid.pricePerCall}/round</p>
                  <p>rating {bid.avgRating.toFixed(2)}</p>
                  <Button
                    disabled={!isClosed || isActing}
                    type="button"
                    variant={isClosed ? "default" : "outline"}
                    onClick={() => void selectAgent(bid.agentId)}
                  >
                    {isActing ? copy.selecting : copy.select}
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
