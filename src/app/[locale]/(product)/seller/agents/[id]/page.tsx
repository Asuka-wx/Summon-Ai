import { getCurrentUserProfile } from "@/lib/server/current-user";
import { getLatestLeaderboardSnapshots } from "@/lib/leaderboards/snapshots";
import { getSellerAgent } from "@/lib/seller/agents";
import { listAgentTestRuns } from "@/lib/seller/tests";

type SellerAgentDetailPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function SellerAgentDetailPage({
  params,
}: SellerAgentDetailPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const currentUser = await getCurrentUserProfile();
  const [agent, testRuns, snapshots] = await Promise.all([
    getSellerAgent(currentUser.id, id),
    listAgentTestRuns({
      ownerId: currentUser.id,
      agentId: id,
    }),
    getLatestLeaderboardSnapshots(),
  ]);
  const weeklyRank =
    snapshots.weeklyOverall?.rankings.find((entry) => entry.agent_id === id)?.rank ?? null;
  const monthlyRank =
    snapshots.monthlyOverall?.rankings.find((entry) => entry.agent_id === id)?.rank ?? null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "供给侧 Agent 详情" : "Seller Agent Detail"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">{agent.name}</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{agent.tagline}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">
            {normalizedLocale === "zh" ? "Agent 概览" : "Agent overview"}
          </h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">
            {agent.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(agent.categories ?? []).map((category: string) => (
              <span key={category} className="rounded-full border border-border bg-background px-3 py-1">
                {category}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">
            {normalizedLocale === "zh" ? "运行指标" : "Runtime metrics"}
          </h2>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <p>Status: {agent.status}</p>
            <p>Quality: {agent.quality_status ?? "normal"}</p>
            <p>Health: {agent.health_score ?? 0}</p>
            <p>Rating: {agent.avg_rating ?? 0} ({agent.rating_count ?? 0})</p>
            <p>Total tasks: {agent.total_tasks ?? 0}</p>
            <p>Earnings: ${agent.total_earnings ?? 0}</p>
            <p>Tips: ${agent.total_tips ?? 0}</p>
            <p>Seed slots left: {agent.seed_free_remaining ?? 0}</p>
            <p>SDK version: {agent.sdk_version ?? "-"}</p>
            <p>Last heartbeat: {agent.sdk_last_heartbeat ?? "-"}</p>
            <p>Weekly overall rank: {weeklyRank ?? "-"}</p>
            <p>Monthly overall rank: {monthlyRank ?? "-"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">
          {normalizedLocale === "zh" ? "最近测试记录" : "Recent test runs"}
        </h2>
        <div className="mt-6 grid gap-4">
          {testRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {normalizedLocale === "zh"
                ? "当前还没有测试记录。"
                : "No test runs are available yet."}
            </p>
          ) : (
            testRuns.map((run) => (
              <a
                key={run.id}
                className="rounded-3xl border border-border/70 bg-background/75 p-5 hover:bg-accent"
                href={`/${normalizedLocale}/seller/test-room/${run.task_id}`}
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {run.status}
                </p>
                <p className="mt-2 break-all text-sm text-foreground">{run.task_id}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  SE {run.self_eval ? "yes" : "no"} · ST {run.streaming ? "yes" : "no"} · DN{" "}
                  {run.done_signal ? "yes" : "no"} · HB {run.heartbeat ? "yes" : "no"}
                </p>
              </a>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
