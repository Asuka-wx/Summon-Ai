import { ConfigManager } from "@/components/admin/config-manager";
import { listAdminConfigEntries } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminConfigPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminConfigPage({ params }: AdminConfigPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const config = await listAdminConfigEntries();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "平台参数" : "Config"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "查看平台运行参数" : "Inspect platform runtime settings"}
        </h1>
      </section>
      <ConfigManager
        locale={normalizedLocale}
        initialEntries={config.map((entry) => ({
          key: entry.key,
          value: entry.value,
          description: entry.description,
        }))}
      />
    </main>
  );
}
