import { ExportManager } from "@/components/admin/export-manager";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminExportPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminExportPage({ params }: AdminExportPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const items = ["users", "agents", "tasks", "transactions", "audit_logs"] as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "数据导出" : "Export"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "导出运营数据 CSV" : "Export operational CSV datasets"}
        </h1>
      </section>
      <ExportManager locale={normalizedLocale} items={items} />
    </main>
  );
}
