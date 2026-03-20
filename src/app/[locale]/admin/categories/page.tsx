import { CategoriesManager } from "@/components/admin/categories-manager";
import { listAdminCategories } from "@/lib/admin/categories";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminCategoriesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminCategoriesPage({
  params,
}: AdminCategoriesPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const categories = await listAdminCategories();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "类别管理" : "Categories"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "管理 Agent 分类结构" : "Manage the agent category structure"}
        </h1>
      </section>
      <CategoriesManager locale={normalizedLocale} initialCategories={categories} />
    </main>
  );
}
