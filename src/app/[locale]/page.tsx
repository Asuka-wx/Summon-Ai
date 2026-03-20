import { setRequestLocale } from "next-intl/server";

import { MarketplaceHomePage } from "@/components/home/marketplace-home";
import { listPublicAgents } from "@/lib/agents/catalog";
import { getPlatformConfigValue } from "@/lib/platform-config/service";
import { getRecommendedAgentsForUser } from "@/lib/recommendations/service";
import { getCurrentUserId } from "@/lib/server/current-user";

type LocalePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleHomePage({ params }: LocalePageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";

  setRequestLocale(locale);
  const currentUserId = await getCurrentUserId();
  const [recommended, hotAgents, newAgents, freeAgents, categories] = await Promise.all([
    getRecommendedAgentsForUser(currentUserId),
    listPublicAgents({ section: "hot", limit: 6, offset: 0 }),
    listPublicAgents({ section: "new", limit: 6, offset: 0 }),
    listPublicAgents({ section: "free", limit: 6, offset: 0 }),
    getPlatformConfigValue<string[]>("agent_categories", []),
  ]);

  return (
    <MarketplaceHomePage
      locale={normalizedLocale}
      categories={categories}
      showRecommended={Boolean(currentUserId)}
      recommendedAgents={recommended.agents}
      hotAgents={hotAgents}
      newAgents={newAgents}
      freeAgents={freeAgents}
    />
  );
}
