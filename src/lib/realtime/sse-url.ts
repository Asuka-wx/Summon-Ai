import { createClient as createServerClient } from "@/lib/supabase/server";

type BuildSseUrlOptions = {
  taskId?: string;
  broadcastId?: string;
};

export async function buildAuthenticatedSseUrl({
  taskId,
  broadcastId,
}: BuildSseUrlOptions) {
  const baseUrl = process.env.NEXT_PUBLIC_SSE_URL;

  if (!baseUrl) {
    throw new Error("validation_error");
  }

  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("unauthorized");
  }

  const url = new URL("/sse/connect", baseUrl);
  url.searchParams.set("token", session.access_token);

  if (taskId) {
    url.searchParams.set("task_id", taskId);
  }

  if (broadcastId) {
    url.searchParams.set("broadcast_id", broadcastId);
  }

  return url.toString();
}
