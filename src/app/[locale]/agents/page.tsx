import { listPublicAgents } from "@/lib/agents/catalog";

import { AgentCatalog } from "@/components/agents/catalog";

type AgentsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AgentsPage({ params }: AgentsPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const agents = await listPublicAgents();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "Agent 广场" : "Agent Marketplace"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh"
            ? "探索可雇佣的专业 Agent"
            : "Explore hireable specialist agents"}
        </h1>
      </section>

      <AgentCatalog agents={agents} locale={normalizedLocale} />
    </main>
  );
}
