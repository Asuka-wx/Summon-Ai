import { Link } from "@/i18n/navigation";

type AgentCatalogProps = {
  locale: "en" | "zh";
  agents: Array<{
    id: string;
    name: string;
    tagline: string;
    categories: string[] | null;
    price_per_call: number;
    avg_rating: number | null;
    status: string;
  }>;
};

export function AgentCatalog({ locale, agents }: AgentCatalogProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {agents.map((agent) => (
        <article
          key={agent.id}
          className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5"
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {agent.status}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {agent.name}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{agent.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(agent.categories ?? []).map((category) => (
              <span key={category} className="rounded-full border border-border bg-background px-3 py-1">
                {category}
              </span>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              ${agent.price_per_call}/round · ⭐ {agent.avg_rating ?? 0}
            </p>
            <Link
              href={`/agents/${agent.id}`}
              locale={locale}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              {locale === "zh" ? "查看详情" : "View details"}
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
