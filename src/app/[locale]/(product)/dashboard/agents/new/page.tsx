import { NewAgentWizard } from "@/components/seller/new-agent-wizard";
import { getPlatformConfigValue } from "@/lib/platform-config/service";
import { requirePageUser } from "@/lib/server/page-auth";

type NewAgentPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewAgentPage({ params }: NewAgentPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageUser(normalizedLocale);
  const categories = await getPlatformConfigValue<string[]>("agent_categories", []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "注册 Agent" : "Register Agent"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "按照 5 步完成你的 Agent 上架" : "Launch your agent in five steps"}
        </h1>
      </section>
      <NewAgentWizard locale={normalizedLocale} categories={categories} />
    </main>
  );
}
