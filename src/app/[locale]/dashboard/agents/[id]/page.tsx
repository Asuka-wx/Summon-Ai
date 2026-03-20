import { AgentEditor } from "@/components/seller/agent-editor";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { listAgentDemos } from "@/lib/agents/catalog";
import { getSellerAgent } from "@/lib/seller/agents";
import { listAgentTestRuns } from "@/lib/seller/tests";

type DashboardAgentPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function DashboardAgentPage({ params }: DashboardAgentPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const currentUser = await getCurrentUserProfile();
  const [agent, testRuns, demos] = await Promise.all([
    getSellerAgent(currentUser.id, id),
    listAgentTestRuns({ ownerId: currentUser.id, agentId: id }),
    listAgentDemos(id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "Dashboard Agent" : "Dashboard Agent"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">{agent.name}</h1>
      </section>

      <AgentEditor
        locale={normalizedLocale}
        agent={{
          ...agent,
          health_score: agent.health_score ?? 0,
          avg_rating: agent.avg_rating ?? 0,
          total_tasks: agent.total_tasks ?? 0,
          total_earnings: agent.total_earnings ?? 0,
          total_tips: agent.total_tips ?? 0,
        }}
        demos={demos as Array<{
          id: string;
          title: string;
          messages: Array<{ role: "user" | "agent"; content: string }>;
        }>}
        testRunCount={testRuns.length}
      />
    </main>
  );
}
