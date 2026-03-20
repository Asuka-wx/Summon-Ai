"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Link } from "@/i18n/navigation";

type HeaderNotificationLinkProps = {
  locale: string;
};

type UnreadCountResponse = {
  unread_count?: number;
  poll_interval_seconds?: number;
};

export function HeaderNotificationLink({
  locale,
}: HeaderNotificationLinkProps) {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    async function loadUnreadCount() {
      const result = await fetch("/api/v1/notifications/unread-count")
        .then((response) => {
          if (!response.ok) {
            return null;
          }

          return response.json() as Promise<UnreadCountResponse>;
        })
        .catch(() => null);

      if (!mounted) {
        return;
      }

      if (result?.unread_count === undefined) {
        setUnreadCount(null);
        return;
      }

      setUnreadCount(result.unread_count);

      if (timer !== null) {
        window.clearTimeout(timer);
      }

      timer = window.setTimeout(
        () => void loadUnreadCount(),
        Number(result.poll_interval_seconds ?? 30) * 1000,
      );
    }

    void loadUnreadCount();

    return () => {
      mounted = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  if (unreadCount === null) {
    return null;
  }

  return (
    <Link
      href="/my/notifications"
      locale={locale}
      className="relative inline-flex items-center justify-center rounded-2xl border border-border bg-card/80 px-3 py-2 text-sm text-foreground hover:bg-accent"
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
