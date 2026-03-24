import { FollowingPanel } from "@/components/my/following-panel";
import { listUserFollowing } from "@/lib/follows/service";
import { requirePageUser } from "@/lib/server/page-auth";

type MyFollowingPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MyFollowingPage({ params }: MyFollowingPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const items = await listUserFollowing(userId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "我的关注" : "Following"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "查看你收藏的 Agent 与创作者"
            : "Review the agents and creators you follow"}
        </h1>
      </section>

      <FollowingPanel locale={normalizedLocale} items={items} />
    </main>
  );
}
