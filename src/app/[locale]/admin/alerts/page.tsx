import { AlertsManager } from "@/components/admin/alerts-manager";
import { listAdminAlerts } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminAlertsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminAlertsPage({ params }: AdminAlertsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminAlerts({
    page: 1,
    limit: 20,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "异常告警" : "Alerts"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "查看风控与系统告警" : "Review fraud and system alerts"}
        </h1>
      </section>
      <AlertsManager locale={normalizedLocale} initialAlerts={result.alerts} />
    </main>
  );
}
