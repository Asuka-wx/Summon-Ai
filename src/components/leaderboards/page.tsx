import { Link } from "@/i18n/navigation";

type RankingEntry = {
  agent_id: string;
  rank: number;
  score: number;
  avg_rating?: string;
  task_count?: number;
  health_score?: string;
};

type SnapshotGroup = {
  weeklyOverall: {
    period_start: string;
    period_end: string;
    rankings: RankingEntry[];
  } | null;
  monthlyOverall: {
    period_start: string;
    period_end: string;
    rankings: RankingEntry[];
  } | null;
  weeklyCategories: Array<{
    category: string | null;
    rankings: RankingEntry[];
  }>;
};

type LeaderboardsPageProps = {
  locale: "en" | "zh";
  snapshots: SnapshotGroup;
};

function renderBoard(
  title: string,
  rankings: RankingEntry[],
  emptyMessage: string,
  locale: "en" | "zh",
) {
  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-6 space-y-3">
        {rankings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          rankings.slice(0, 10).map((entry) => (
            <div
              key={`${title}-${entry.agent_id}`}
              className="rounded-3xl border border-border/70 bg-background/75 p-5"
            >
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    #{entry.rank}
                  </p>
                  <Link
                    href={`/agents/${entry.agent_id}`}
                    locale={locale}
                    className="mt-3 block text-sm text-foreground hover:underline"
                  >
                    {entry.agent_id}
                  </Link>
                  <p className="mt-2 text-sm text-muted-foreground">
                    score {entry.score} · rating {entry.avg_rating ?? "-"} · tasks {entry.task_count ?? 0} · health {entry.health_score ?? "-"}
                  </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function LeaderboardsPage({ locale, snapshots }: LeaderboardsPageProps) {
  const copy =
    locale === "zh"
      ? {
          eyebrow: "排行榜",
          title: "平台排行榜与分类榜单",
          weekly: "周榜 Overall",
          monthly: "月榜 Overall",
          categories: "周榜 Category Boards",
          empty: "当前还没有可展示的排行榜快照。",
        }
      : {
          eyebrow: "Leaderboards",
          title: "Platform leaderboards and category boards",
          weekly: "Weekly Overall",
          monthly: "Monthly Overall",
          categories: "Weekly Category Boards",
          empty: "No leaderboard snapshots are available yet.",
        };

  return (
    <>
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">{copy.title}</h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderBoard(copy.weekly, snapshots.weeklyOverall?.rankings ?? [], copy.empty, locale)}
        {renderBoard(copy.monthly, snapshots.monthlyOverall?.rankings ?? [], copy.empty, locale)}
      </div>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.categories}</h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {snapshots.weeklyCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          ) : (
            snapshots.weeklyCategories.map((board) => (
              <div
                key={board.category ?? "uncategorized"}
                className="rounded-3xl border border-border/70 bg-background/75 p-5"
              >
                <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                  {board.category ?? "uncategorized"}
                </p>
                <div className="mt-4 space-y-2">
                  {board.rankings.slice(0, 5).map((entry) => (
                    <Link
                      key={`${board.category}-${entry.agent_id}`}
                      href={`/agents/${entry.agent_id}`}
                      locale={locale}
                      className="block text-sm text-foreground hover:underline"
                    >
                      #{entry.rank} {entry.agent_id}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
