import { AdminMaintenancePanel } from "@/components/admin/maintenance-panel";
import { SystemStatusPanel } from "@/components/admin/system-status-panel";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGasStatus } from "@/lib/payments/service";
import { getPlatformConfigValue } from "@/lib/platform-config/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminSystemPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminSystemPage({ params }: AdminSystemPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const supabase = createAdminClient();
  const [gasStatus, maintenanceMode, heartbeats] = await Promise.all([
    getGasStatus(),
    getPlatformConfigValue("maintenance_mode", { enabled: false }),
    supabase.from("cron_heartbeats").select("*").order("job_name", { ascending: true }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "系统状态" : "System"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "维护模式与运行健康" : "Maintenance and runtime health"}
        </h1>
      </section>

      <SystemStatusPanel
        locale={normalizedLocale}
        initialGas={gasStatus}
        initialHealth={{
          name: "SummonAI",
          status: "ok",
          timestamp: new Date().toISOString(),
          services: {
            supabase: "configured",
            realtime: process.env.NEXT_PUBLIC_SSE_URL ? "configured" : "missing_env",
          },
        }}
        initialHeartbeats={heartbeats.data ?? []}
        initialMaintenanceEnabled={Boolean((maintenanceMode as { enabled?: boolean })?.enabled)}
      />

      <AdminMaintenancePanel locale={normalizedLocale} />
    </main>
  );
}
