"use client";

import { createClient } from "@/lib/supabase/client";

function getSseBaseUrl() {
  return process.env.NEXT_PUBLIC_SSE_URL ?? "";
}

export async function createTaskEventSource(taskId: string) {
  const baseUrl = getSseBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }

  const url = new URL("/sse/connect", baseUrl);
  url.searchParams.set("token", session.access_token);
  url.searchParams.set("task_id", taskId);

  return new EventSource(url.toString());
}
