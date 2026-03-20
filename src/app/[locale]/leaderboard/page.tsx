import { getLatestLeaderboardSnapshots } from "@/lib/leaderboards/snapshots";

import { LeaderboardsPage } from "@/components/leaderboards/page";

type LeaderboardPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const snapshots = await getLatestLeaderboardSnapshots();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <LeaderboardsPage locale={normalizedLocale} snapshots={snapshots} />
    </main>
  );
}
