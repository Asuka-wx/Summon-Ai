import { sendRelayMessage } from "@/lib/realtime/relay-client";

import type { AgentFaultEvent } from "@/lib/faults/types";

export async function pushAgentFaultEvent(event: AgentFaultEvent) {
  await sendRelayMessage({
    targetTaskId: event.task_id,
    type: "agent:fault",
    ...event,
  }).catch(() => {});
}
