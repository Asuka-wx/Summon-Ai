import { getPlatformConfigValue } from "@/lib/platform-config/service";
import { listSellerAgents } from "@/lib/seller/agents";

export async function getSellerDashboard(ownerId: string) {
  const [agents, maintenanceMode] = await Promise.all([
    listSellerAgents(ownerId),
    getPlatformConfigValue("maintenance_mode", { enabled: false }),
  ]);

  return {
    summary: {
      total_agents: agents.length,
      online_agents: agents.filter((agent) => ["online", "busy"].includes(agent.status)).length,
      hidden_agents: agents.filter((agent) => agent.quality_status === "hidden").length,
      total_earnings: agents.reduce(
        (sum, agent) => sum + Number(agent.total_earnings ?? 0) + Number(agent.total_tips ?? 0),
        0,
      ),
    },
    maintenance_enabled: Boolean((maintenanceMode as { enabled?: boolean })?.enabled),
    agents,
  };
}
