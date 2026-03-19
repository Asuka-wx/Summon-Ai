import { randomBytes } from "node:crypto";

import { hashApiKey } from "@/lib/security/sdk-signature";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function createUniqueAgentSlug(baseName: string) {
  const supabase = createAdminClient();
  const baseSlug = slugify(baseName) || "agent";
  let candidate = baseSlug;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${randomBytes(3).toString("hex")}`;
  }

  return `${baseSlug}-${randomBytes(4).toString("hex")}`;
}

function generateAgentApiKey() {
  return `sa_${randomBytes(24).toString("hex")}`;
}

export async function listSellerAgents(ownerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, active_tasks, max_concurrent, concurrency_level, sdk_version, sdk_last_heartbeat, quality_status, health_score, avg_rating, rating_count, total_tasks, total_earnings, total_tips, is_seed, seed_free_remaining, seed_max_rounds, created_at",
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getSellerAgent(ownerId: string, agentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select(
      "id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, active_tasks, max_concurrent, concurrency_level, sdk_version, sdk_last_heartbeat, quality_status, health_score, avg_rating, rating_count, total_tasks, total_earnings, total_tips, is_seed, seed_free_remaining, seed_max_rounds, created_at",
    )
    .eq("owner_id", ownerId)
    .eq("id", agentId)
    .single();

  if (error || !data) {
    throw new Error("not_agent_owner");
  }

  return data;
}

export async function createSellerAgent({
  ownerId,
  name,
  tagline,
  description,
  categories,
  supportedLanguages,
  pricePerCall,
}: {
  ownerId: string;
  name: string;
  tagline: string;
  description: string;
  categories: string[];
  supportedLanguages: string[];
  pricePerCall: number;
}) {
  const supabase = createAdminClient();
  const apiKey = generateAgentApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  const slug = await createUniqueAgentSlug(name);

  const { data, error } = await supabase
    .from("agents")
    .insert({
      owner_id: ownerId,
      name,
      slug,
      tagline,
      description,
      categories,
      supported_languages: supportedLanguages,
      price_per_call: pricePerCall,
      api_key_hash: apiKeyHash,
      sdk_version: "1.0.0",
      status: "offline",
      is_seed: true,
      seed_free_remaining: Number(process.env.SEED_TASK_LIMIT ?? 5),
      seed_max_rounds: Number(process.env.SEED_MAX_ROUNDS ?? 15),
    })
    .select(
      "id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, seed_free_remaining, seed_max_rounds, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error("validation_error");
  }

  return {
    agent: data,
    apiKey,
  };
}

export async function updateSellerAgentProfile({
  ownerId,
  agentId,
  payload,
}: {
  ownerId: string;
  agentId: string;
  payload: {
    name?: string;
    tagline?: string;
    description?: string;
    categories?: string[];
    supported_languages?: string[];
    price_per_call?: number;
  };
}) {
  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof payload.name === "string" && payload.name.trim().length > 0) {
    updates.name = payload.name.trim();
    updates.slug = await createUniqueAgentSlug(payload.name.trim());
  }

  if (typeof payload.tagline === "string" && payload.tagline.trim().length > 0) {
    updates.tagline = payload.tagline.trim();
  }

  if (typeof payload.description === "string" && payload.description.trim().length > 0) {
    updates.description = payload.description.trim();
  }

  if (Array.isArray(payload.categories) && payload.categories.length > 0) {
    updates.categories = payload.categories;
  }

  if (
    Array.isArray(payload.supported_languages) &&
    payload.supported_languages.length > 0
  ) {
    updates.supported_languages = payload.supported_languages;
  }

  if (typeof payload.price_per_call === "number" && payload.price_per_call >= 0) {
    updates.price_per_call = payload.price_per_call;
  }

  const { data, error } = await supabase
    .from("agents")
    .update(updates)
    .eq("id", agentId)
    .eq("owner_id", ownerId)
    .select(
      "id, name, slug, tagline, description, categories, supported_languages, status, price_per_call, quality_status, health_score, avg_rating, rating_count, total_tasks, total_earnings, total_tips, is_seed, seed_free_remaining, seed_max_rounds, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error("not_agent_owner");
  }

  return data;
}

export async function setSellerAgentStatus({
  ownerId,
  agentId,
  status: requestedStatus,
}: {
  ownerId: string;
  agentId: string;
  status: "online" | "offline" | "retiring" | "archived";
}) {
  const supabase = createAdminClient();
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, owner_id, status, active_tasks, quality_status")
    .eq("id", agentId)
    .single();

  if (agentError || !agent || agent.owner_id !== ownerId) {
    throw new Error("not_agent_owner");
  }

  if (agent.quality_status === "hidden" && requestedStatus === "online") {
    throw new Error("agent_unavailable");
  }

  if (requestedStatus === "archived" && Number(agent.active_tasks ?? 0) > 0) {
    throw new Error("invalid_task_state");
  }

  const nextStatus =
    requestedStatus === "online" && Number(agent.active_tasks ?? 0) > 0
      ? "busy"
      : requestedStatus;

  const { data, error } = await supabase
    .from("agents")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId)
    .eq("owner_id", ownerId)
    .select("id, status, active_tasks, quality_status, updated_at")
    .single();

  if (error || !data) {
    throw new Error("not_agent_owner");
  }

  return data;
}
