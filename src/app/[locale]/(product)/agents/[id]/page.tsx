import { getCurrentUserId } from "@/lib/server/current-user";
import {
  getPublicAgentDetail,
  listAgentDemos,
  listAgentRatings,
} from "@/lib/agents/catalog";
import { getSimilarAgents } from "@/lib/recommendations/service";

import { AgentDetail } from "@/components/agents/detail";

type AgentDetailPageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export default async function AgentDetailPage({ params }: AgentDetailPageProps) {
  const { locale, id } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const viewerId = await getCurrentUserId();
  const [detail, ratings, demos, similarAgents] = await Promise.all([
    getPublicAgentDetail(id, viewerId),
    listAgentRatings({ agentId: id, page: 1, limit: 10 }),
    listAgentDemos(id),
    getSimilarAgents(id, viewerId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <AgentDetail
        agent={detail.agent}
        creator={detail.creator}
        demos={
          demos as Array<{
            id: string;
            title: string;
            messages: Array<{ role: "user" | "agent"; content: string }>;
          }>
        }
        locale={normalizedLocale}
        ratings={ratings.ratings}
        similarAgents={similarAgents}
        viewer={detail.viewer}
      />
    </main>
  );
}
