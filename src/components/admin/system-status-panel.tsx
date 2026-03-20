"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CronHeartbeat = {
  job_name: string;
  last_success_at: string | null;
  last_error: string | null;
  expected_interval: string;
};

type SystemStatusPanelProps = {
  locale: "en" | "zh";
  initialHealth: {
    name: string;
    status: string;
    timestamp: string;
    services: {
      supabase: string;
      realtime: string;
    };
  };
  initialGas: {
    level: string;
    eth_balance: number;
  };
  initialMaintenanceEnabled: boolean;
  initialHeartbeats: CronHeartbeat[];
};

export function SystemStatusPanel({
  locale,
  initialHealth,
  initialGas,
  initialMaintenanceEnabled,
  initialHeartbeats,
}: SystemStatusPanelProps) {
  const [health, setHealth] = useState(initialHealth);
  const [gas, setGas] = useState(initialGas);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(initialMaintenanceEnabled);
  const [heartbeats, setHeartbeats] = useState(initialHeartbeats);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refresh() {
    setIsRefreshing(true);

    try {
      const [healthResponse, gasResponse, maintenanceResponse, heartbeatsResponse] =
        await Promise.all([
          fetch("/api/v1/health").then((res) => res.json()),
          fetch("/api/v1/admin/gas-balance").then((res) => res.json()),
          fetch("/api/v1/admin/maintenance").then((res) => res.json()),
          fetch("/api/v1/admin/cron-heartbeats").then((res) => res.json()),
        ]);

      setHealth(healthResponse);
      setGas(gasResponse);
      setMaintenanceEnabled(Boolean(maintenanceResponse?.enabled));
      setHeartbeats(heartbeatsResponse?.heartbeats ?? []);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          {isRefreshing
            ? locale === "zh"
              ? "刷新中..."
              : "Refreshing..."
            : locale === "zh"
              ? "刷新状态"
              : "Refresh"}
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">health</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{health.status}</p>
          <p className="mt-2 text-sm text-muted-foreground">{health.timestamp}</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">gas</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{gas.level}</p>
          <p className="mt-2 text-sm text-muted-foreground">{gas.eth_balance.toFixed(6)} ETH</p>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">maintenance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {maintenanceEnabled ? "enabled" : "disabled"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            supabase={health.services.supabase} · realtime={health.services.realtime}
          </p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {locale === "zh" ? "Cron 心跳" : "Cron heartbeats"}
        </h2>
        <div className="mt-6 grid gap-3">
          {heartbeats.map((heartbeat) => (
            <article
              key={heartbeat.job_name}
              className="rounded-2xl border border-border/70 bg-background/75 p-4 text-sm text-muted-foreground"
            >
              <p className="font-medium text-foreground">{heartbeat.job_name}</p>
              <p className="mt-2">interval: {heartbeat.expected_interval}</p>
              <p>last success: {heartbeat.last_success_at ?? "-"}</p>
              <p>last error: {heartbeat.last_error ?? "-"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
