"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type UsersManagerProps = {
  locale: "en" | "zh";
  initialUsers: Array<{
    id: string;
    display_name: string;
    email: string | null;
    role: string;
    is_frozen: boolean;
    balance: number;
  }>;
};

export function UsersManager({ locale, initialUsers }: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState<string | null>(null);

  async function toggleUser(userId: string, frozen: boolean) {
    setMessage(null);

    try {
      const response = await fetch(
        `/api/v1/admin/users/${encodeURIComponent(userId)}/${frozen ? "freeze" : "unfreeze"}`,
        { method: "POST" },
      );

      if (!response.ok) {
        setMessage(locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again.");
        return;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, is_frozen: frozen } : user,
        ),
      );
    } catch {
      setMessage(locale === "zh" ? "操作失败，请稍后重试。" : "Action failed. Please try again.");
    }
  }

  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <article
          key={user.id}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {user.role}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                {user.display_name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{user.email ?? "-"}</p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p>balance ${user.balance.toFixed(2)}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  href={`/${locale}/admin/users/${user.id}`}
                >
                  {locale === "zh" ? "查看详情" : "View detail"}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void toggleUser(user.id, !user.is_frozen)}
                >
                  {user.is_frozen
                    ? locale === "zh"
                      ? "解冻"
                      : "Unfreeze"
                    : locale === "zh"
                      ? "冻结"
                      : "Freeze"}
                </Button>
              </div>
            </div>
          </div>
        </article>
      ))}
      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
