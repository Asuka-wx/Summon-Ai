"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type NotificationsCenterProps = {
  locale: "en" | "zh";
  initialNotifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    is_read: boolean;
  }>;
};

export function NotificationsCenter({
  locale,
  initialNotifications,
}: NotificationsCenterProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [tab, setTab] = useState<"all" | "unread">("all");

  async function markAllRead() {
    await fetch("/api/v1/notifications/read-all", {
      method: "POST",
    }).catch(() => null);
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
  }

  async function markRead(id: string) {
    await fetch(`/api/v1/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
    }).catch(() => null);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item)),
    );
  }

  const filtered =
    tab === "unread" ? notifications.filter((item) => !item.is_read) : notifications;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={tab === "all" ? "default" : "outline"}
          onClick={() => setTab("all")}
        >
          {locale === "zh" ? "全部" : "All"}
        </Button>
        <Button
          type="button"
          variant={tab === "unread" ? "default" : "outline"}
          onClick={() => setTab("unread")}
        >
          {locale === "zh" ? "未读" : "Unread"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void markAllRead()}>
          {locale === "zh" ? "全部标记已读" : "Mark all read"}
        </Button>
      </div>
      {filtered.map((notification) => (
        <article
          key={notification.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {notification.type}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                {notification.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {notification.body}
              </p>
            </div>
            {!notification.is_read ? (
              <Button type="button" variant="outline" onClick={() => void markRead(notification.id)}>
                {locale === "zh" ? "标记已读" : "Mark read"}
              </Button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
