import { getCurrentUserId } from "@/lib/server/current-user";
import { getPublicAgentDetail } from "@/lib/agents/catalog";

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
  const detail = await getPublicAgentDetail(id, viewerId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <AgentDetail
        agent={detail.agent}
        locale={normalizedLocale}
        viewer={detail.viewer}
      />
    </main>
  );
}
