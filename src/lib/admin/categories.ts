import { getPlatformConfigValue, setPlatformConfigValue } from "@/lib/platform-config/service";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

export async function listAdminCategories() {
  const supabase = createAdminClient();
  const categories = normalizeCategories(
    await getPlatformConfigValue("agent_categories", [] as string[]),
  );
  const { data: agents } = await supabase.from("agents").select("categories");

  const counts = new Map<string, number>();

  for (const category of categories) {
    counts.set(category, 0);
  }

  for (const agent of agents ?? []) {
    for (const category of agent.categories ?? []) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return categories.map((category, index) => ({
    name: category,
    sort_order: index,
    agent_count: counts.get(category) ?? 0,
  }));
}

export async function createAdminCategory(name: string) {
  const categories = normalizeCategories(
    await getPlatformConfigValue("agent_categories", [] as string[]),
  );

  if (categories.includes(name)) {
    throw new Error("validation_error");
  }

  const nextCategories = [...categories, name];
  await setPlatformConfigValue("agent_categories", nextCategories, "Agent category list.");

  return {
    name,
    sort_order: nextCategories.length - 1,
  };
}

export async function updateAdminCategory({
  currentName,
  nextName,
  nextSortOrder,
}: {
  currentName: string;
  nextName?: string;
  nextSortOrder?: number;
}) {
  const supabase = createAdminClient();
  const categories = normalizeCategories(
    await getPlatformConfigValue("agent_categories", [] as string[]),
  );
  const currentIndex = categories.indexOf(currentName);

  if (currentIndex === -1) {
    throw new Error("not_found");
  }

  const updatedCategories = [...categories];
  const resolvedName = nextName?.trim() || currentName;

  if (resolvedName !== currentName && updatedCategories.includes(resolvedName)) {
    throw new Error("validation_error");
  }

  updatedCategories[currentIndex] = resolvedName;

  if (typeof nextSortOrder === "number") {
    const [moved] = updatedCategories.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(nextSortOrder, updatedCategories.length));
    updatedCategories.splice(targetIndex, 0, moved);
  }

  await setPlatformConfigValue(updatedCategories ? "agent_categories" : "agent_categories", updatedCategories, "Agent category list.");

  if (resolvedName !== currentName) {
    const { data: agents } = await supabase
      .from("agents")
      .select("id, categories")
      .contains("categories", [currentName]);

    for (const agent of agents ?? []) {
      const categoriesForAgent = (agent.categories ?? []).map((category: string) =>
        category === currentName ? resolvedName : category,
      );

      await supabase
        .from("agents")
        .update({
          categories: categoriesForAgent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agent.id);
    }
  }

  return {
    name: resolvedName,
    sort_order: updatedCategories.indexOf(resolvedName),
  };
}

export async function deleteAdminCategory(name: string) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .contains("categories", [name]);

  if ((count ?? 0) > 0) {
    throw new Error("invalid_task_state");
  }

  const categories = normalizeCategories(
    await getPlatformConfigValue("agent_categories", [] as string[]),
  );
  const nextCategories = categories.filter((category) => category !== name);

  if (nextCategories.length === categories.length) {
    throw new Error("not_found");
  }

  await setPlatformConfigValue("agent_categories", nextCategories, "Agent category list.");

  return {
    ok: true,
    name,
  };
}
