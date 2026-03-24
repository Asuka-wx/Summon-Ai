import { getCreatorProfile } from "@/lib/creators/service";

type CreatorPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const profile = await getCreatorProfile(id);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "创作者主页" : "Creator Profile"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {profile.creator.display_name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {profile.creator.bio ??
            (normalizedLocale === "zh"
              ? "这位创作者尚未填写简介。"
              : "This creator has not written a public bio yet.")}
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {normalizedLocale === "zh" ? "Agent 数量" : "Agents"}
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {profile.summary.total_agents}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {normalizedLocale === "zh" ? "累计任务" : "Tasks"}
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {profile.summary.total_tasks}
          </p>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {normalizedLocale === "zh" ? "平均评分" : "Average rating"}
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground">
            {profile.summary.average_rating}
          </p>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
          {normalizedLocale === "zh" ? "徽章" : "Badges"}
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {profile.badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {normalizedLocale === "zh" ? "暂无公开徽章。" : "No public badges yet."}
            </p>
          ) : (
            profile.badges.map((entry) => (
              <div
                key={`${entry.badge.code}-${entry.earned_at}`}
                className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-foreground"
              >
                {entry.badge.name}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4">
        {profile.agents.map((agent) => (
          <a
            key={agent.id}
            className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5"
            href={`/${normalizedLocale}/agents/${agent.id}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {agent.status}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {agent.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{agent.tagline}</p>
              </div>
              <div className="grid gap-2 text-sm text-muted-foreground">
                <p>${agent.price_per_call}/round</p>
                <p>rating {agent.avg_rating ?? 0}</p>
                <p>tasks {agent.total_tasks}</p>
              </div>
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
