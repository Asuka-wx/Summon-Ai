"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CategoriesManagerProps = {
  locale: "en" | "zh";
  initialCategories: Array<{
    name: string;
    sort_order: number;
    agent_count: number;
  }>;
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      newCategory: "新类别名称",
      create: "新增类别",
      creating: "创建中...",
      rename: "重命名",
      sort: "排序",
      save: "保存",
      delete: "删除",
      saving: "处理中...",
      success: "操作完成。",
      failed: "操作失败，请稍后重试。",
    };
  }

  return {
    newCategory: "New category name",
    create: "Create category",
    creating: "Creating...",
    rename: "Rename",
    sort: "Sort order",
    save: "Save",
    delete: "Delete",
    saving: "Working...",
    success: "Action completed.",
    failed: "Action failed. Please try again.",
  };
}

export function CategoriesManager({
  locale,
  initialCategories,
}: CategoriesManagerProps) {
  const copy = getCopy(locale);
  const [categories, setCategories] = useState(
    initialCategories.map((category) => ({
      ...category,
      nextName: category.name,
      nextSortOrder: String(category.sort_order),
    })),
  );
  const [newCategory, setNewCategory] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function createCategory() {
    setSavingKey("new");
    setMessage(null);

    try {
      const response = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: newCategory }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.category) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setCategories((current) => [
        ...current,
        {
          ...payload.category,
          agent_count: 0,
          nextName: payload.category.name,
          nextSortOrder: String(payload.category.sort_order ?? current.length),
        },
      ]);
      setNewCategory("");
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setSavingKey(null);
    }
  }

  async function saveCategory(name: string) {
    const target = categories.find((category) => category.name === name);

    if (!target) {
      return;
    }

    setSavingKey(name);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/categories/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: target.nextName,
          sort_order: Number(target.nextSortOrder),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.category) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setCategories((current) =>
        current.map((category) =>
          category.name === name
            ? {
                ...category,
                name: payload.category.name,
                sort_order: payload.category.sort_order,
                nextName: payload.category.name,
                nextSortOrder: String(payload.category.sort_order),
              }
            : category,
        ),
      );
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteCategory(name: string) {
    setSavingKey(name);
    setMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/categories/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(payload?.message ?? copy.failed);
        return;
      }

      setCategories((current) => current.filter((category) => category.name !== name));
      setMessage(copy.success);
    } catch {
      setMessage(copy.failed);
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-lg shadow-primary/5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            placeholder={copy.newCategory}
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
          />
          <Button disabled={savingKey === "new"} type="button" onClick={() => void createCategory()}>
            {savingKey === "new" ? copy.creating : copy.create}
          </Button>
        </div>
      </section>

      {categories.map((category) => (
        <article
          key={category.name}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_140px_auto_auto] lg:items-center">
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              value={category.nextName}
              onChange={(event) =>
                setCategories((current) =>
                  current.map((item) =>
                    item.name === category.name ? { ...item, nextName: event.target.value } : item,
                  ),
                )
              }
            />
            <input
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
              inputMode="numeric"
              value={category.nextSortOrder}
              onChange={(event) =>
                setCategories((current) =>
                  current.map((item) =>
                    item.name === category.name
                      ? { ...item, nextSortOrder: event.target.value }
                      : item,
                  ),
                )
              }
            />
            <Button
              disabled={savingKey === category.name}
              type="button"
              variant="outline"
              onClick={() => void saveCategory(category.name)}
            >
              {savingKey === category.name ? copy.saving : copy.save}
            </Button>
            <Button
              disabled={savingKey === category.name}
              type="button"
              variant="outline"
              onClick={() => void deleteCategory(category.name)}
            >
              {savingKey === category.name ? copy.saving : copy.delete}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {category.agent_count} linked agents
          </p>
        </article>
      ))}

      {message ? (
        <div className="rounded-2xl border border-border bg-background/75 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}
    </div>
  );
}
