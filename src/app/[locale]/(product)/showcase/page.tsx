import { ShowcaseFilters } from "@/components/marketing/showcase-filters";
import { listPublicAgents } from "@/lib/agents/catalog";
import { getPlatformConfigValue } from "@/lib/platform-config/service";

import { AgentCatalog } from "@/components/agents/catalog";

type ShowcasePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    section?: string;
    q?: string;
    category?: string;
  }>;
};

export default async function ShowcasePage({
  params,
  searchParams,
}: ShowcasePageProps) {
  const { locale } = await params;
  const { section, q, category } = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const selectedSection =
    section === "hot" ||
    section === "new" ||
    section === "top" ||
    section === "rising" ||
    section === "free"
      ? section
      : undefined;
  const [agents, categories] = await Promise.all([
    listPublicAgents({
      section: selectedSection,
      q,
      category,
      limit: 20,
      offset: 0,
    }),
    getPlatformConfigValue<string[]>("agent_categories", []),
  ]);

  const tabs = [
    ["hot", normalizedLocale === "zh" ? "热门" : "Hot"],
    ["new", normalizedLocale === "zh" ? "新锐" : "New"],
    ["top", normalizedLocale === "zh" ? "最高评分" : "Top Rated"],
    ["rising", normalizedLocale === "zh" ? "进步最快" : "Rising"],
    ["free", normalizedLocale === "zh" ? "免费体验" : "Free"],
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "展厅" : "Showcase"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "浏览可雇佣的专业 Agent"
            : "Discover specialist agents ready for hire"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {normalizedLocale === "zh"
            ? "按热度、新锐、评分、涨势和免费体验视角切换浏览，并按关键词或类别筛选。"
            : "Switch between hot, new, top rated, rising and free views, then narrow the list by search or category."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {tabs.map(([value, label]) => (
            <a
              key={value}
              className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium ${
                selectedSection === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
              href={`/${normalizedLocale}/showcase?section=${encodeURIComponent(value)}`}
            >
              {label}
            </a>
          ))}
        </div>
        <ShowcaseFilters
          locale={normalizedLocale}
          initialCategory={category}
          initialQuery={q}
          initialSection={selectedSection}
          categories={categories}
        />
      </section>

      <AgentCatalog agents={agents} locale={normalizedLocale} />
    </main>
  );
}
