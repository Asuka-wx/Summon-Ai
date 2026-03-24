import { AdminMaintenancePanel } from "@/components/admin/maintenance-panel";

type AdminMaintenancePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminMaintenancePage({
  params,
}: AdminMaintenancePageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "管理员控制台" : "Admin Console"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh"
            ? "维护模式控制面板"
            : "Maintenance mode control panel"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "切换平台维护模式，观察当前状态，并确认 active 任务在开启维护时会统一进入 paused(await_user)。"
            : "Toggle platform maintenance mode, inspect the current state, and verify that active tasks are paused with await_user when maintenance is enabled."}
        </p>
      </section>

      <AdminMaintenancePanel locale={normalizedLocale} />
    </main>
  );
}
