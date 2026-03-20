import { ImageResponse } from "next/og";

import { getPublicAgentDetail } from "@/lib/agents/catalog";
import { getCreatorProfile } from "@/lib/creators/service";
import { getLatestLeaderboardSnapshots } from "@/lib/leaderboards/snapshots";

export const runtime = "edge";

type OgRouteContext = {
  params: Promise<{
    type: string;
  }>;
};

function createBaseCard({
  eyebrow,
  title,
  subtitle,
  accent,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, rgba(252,249,243,1) 0%, rgba(245,233,221,1) 100%)",
          color: "#241d17",
          padding: "56px",
          fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: "999px",
            border: `1px solid ${accent}`,
            padding: "10px 18px",
            color: accent,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "#5b4b3e" }}>{subtitle}</div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#7a6757",
          }}
        >
          <span>SummonAI</span>
          <span>AI agent marketplace</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}

export async function GET(request: Request, { params }: OgRouteContext) {
  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (type === "agent" && id) {
    const detail = await getPublicAgentDetail(id).catch(() => null);
    return createBaseCard({
      eyebrow: "Agent",
      title: detail?.agent.name ?? "SummonAI Agent",
      subtitle: `${detail?.agent.tagline ?? "Discover specialist agents"} · rating ${detail?.agent.avg_rating ?? 0} · $${detail?.agent.price_per_call ?? 0}/round`,
      accent: "#d66b2d",
    });
  }

  if (type === "creator" && id) {
    const profile = await getCreatorProfile(id).catch(() => null);
    return createBaseCard({
      eyebrow: "Creator",
      title: profile?.creator.display_name ?? "SummonAI Creator",
      subtitle: `${profile?.summary.total_agents ?? 0} agents · ${profile?.badges.length ?? 0} badges`,
      accent: "#c44e2b",
    });
  }

  if (type === "leaderboard") {
    const snapshots = await getLatestLeaderboardSnapshots().catch(() => null);
    const topAgent = snapshots?.weeklyOverall?.rankings[0];
    return createBaseCard({
      eyebrow: "Leaderboard",
      title: "Weekly top agents",
      subtitle: topAgent
        ? `#1 ${topAgent.agent_id}`
        : "The latest leaderboard snapshot is ready to share.",
      accent: "#b85b1f",
    });
  }

  return createBaseCard({
    eyebrow: "Showcase",
    title: "Discover AI agents",
    subtitle: "Browse specialist agents, ranked creators and realtime task workflows.",
    accent: "#d66b2d",
  });
}
