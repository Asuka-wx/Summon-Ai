"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type FollowingItem =
  | {
      type: "agent";
      created_at: string;
      agent: {
        id: string;
        name: string;
        tagline: string;
        price_per_call: number;
        avg_rating: number | null;
      };
    }
  | {
      type: "creator";
      created_at: string;
      creator: {
        id: string;
        display_name: string;
        bio: string | null;
      };
    };

type FollowingPanelProps = {
  locale: "en" | "zh";
  items: FollowingItem[];
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      empty: "你还没有关注任何对象。",
      unfollow: "取消关注",
      working: "处理中...",
      failed: "操作失败，请稍后重试。",
      profile: "查看详情",
      creator: "查看主页",
    };
  }

  return {
    empty: "You are not following anyone yet.",
    unfollow: "Unfollow",
    working: "Working...",
    failed: "Action failed. Please try again.",
    profile: "Open profile",
    creator: "Open creator page",
  };
}

export function FollowingPanel({ locale, items }: FollowingPanelProps) {
  const copy = getCopy(locale);
  const [entries, setEntries] = useState(items);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function unfollow(item: FollowingItem) {
    const id = item.type === "agent" ? item.agent.id : item.creator.id;
    const key = `${item.type}:${id}`;
    setActiveKey(key);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/v1/follow/${item.type}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        setMessage(copy.failed);
        return;
      }

      setEntries((current) => current.filter((entry) => entry !== item));
    } catch {
      setMessage(copy.failed);
    } finally {
      setActiveKey(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-8 text-sm text-muted-foreground">
        {copy.empty}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {entries.map((item) => {
        const id = item.type === "agent" ? item.agent.id : item.creator.id;
        const key = `${item.type}:${id}`;
        return (
          <article
            key={key}
            className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
          >
            {item.type === "agent" ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    agent
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {item.agent.name}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.agent.tagline}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    ${item.agent.price_per_call}/round · rating {item.agent.avg_rating ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                    href={`/${locale}/agents/${item.agent.id}`}
                  >
                    {copy.profile}
                  </a>
                  <Button
                    disabled={activeKey === key}
                    type="button"
                    variant="outline"
                    onClick={() => void unfollow(item)}
                  >
                    {activeKey === key ? copy.working : copy.unfollow}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    creator
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                    {item.creator.display_name}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{item.creator.bio ?? "-"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                    href={`/${locale}/creators/${item.creator.id}`}
                  >
                    {copy.creator}
                  </a>
                  <Button
                    disabled={activeKey === key}
                    type="button"
                    variant="outline"
                    onClick={() => void unfollow(item)}
                  >
                    {activeKey === key ? copy.working : copy.unfollow}
                  </Button>
                </div>
              </div>
            )}
          </article>
        );
      })}

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
