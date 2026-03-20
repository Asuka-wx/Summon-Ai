"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ShowcaseFiltersProps = {
  locale: "en" | "zh";
  initialQuery?: string;
  initialCategory?: string;
  initialSection?: "hot" | "new" | "top" | "rising" | "free";
  categories: string[];
};

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      search: "搜索 Agent",
      allCategories: "全部类别",
      apply: "应用筛选",
    };
  }

  return {
    search: "Search agents",
    allCategories: "All categories",
    apply: "Apply filters",
  };
}

export function ShowcaseFilters({
  locale,
  initialQuery,
  initialCategory,
  initialSection,
  categories,
}: ShowcaseFiltersProps) {
  const copy = getCopy(locale);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState(initialCategory ?? "");

  return (
    <form className="mt-6 grid gap-4 md:grid-cols-[1fr_220px_auto]">
      <input
        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
        name="q"
        placeholder={copy.search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
        name="category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      >
        <option value="">{copy.allCategories}</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {initialSection ? <input name="section" type="hidden" value={initialSection} /> : null}
      <Button type="submit">{copy.apply}</Button>
    </form>
  );
}
