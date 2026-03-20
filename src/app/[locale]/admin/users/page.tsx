import { Button } from "@/components/ui/button";
import { UsersManager } from "@/components/admin/users-manager";
import { listAdminUsers } from "@/lib/admin/service";
import { requirePageAdmin } from "@/lib/server/page-auth";

type AdminUsersPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    q?: string;
    role?: string;
    is_frozen?: string;
  }>;
};

export default async function AdminUsersPage({
  params,
  searchParams,
}: AdminUsersPageProps) {
  const { locale } = await params;
  const { q, role, is_frozen } = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  await requirePageAdmin(normalizedLocale);
  const result = await listAdminUsers({
    page: 1,
    limit: 20,
    q,
    role,
    isFrozen:
      is_frozen === undefined ? undefined : is_frozen === "true",
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "用户管理" : "Users"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh" ? "平台用户列表" : "Platform user directory"}
        </h1>
        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_180px_180px_auto]" action="">
          <input
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={q ?? ""}
            name="q"
            placeholder={normalizedLocale === "zh" ? "搜索名称或邮箱" : "Search name or email"}
          />
          <select
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={role ?? ""}
            name="role"
          >
            <option value="">{normalizedLocale === "zh" ? "全部角色" : "All roles"}</option>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <select
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
            defaultValue={is_frozen ?? ""}
            name="is_frozen"
          >
            <option value="">{normalizedLocale === "zh" ? "全部状态" : "All states"}</option>
            <option value="false">{normalizedLocale === "zh" ? "正常" : "Active"}</option>
            <option value="true">{normalizedLocale === "zh" ? "已冻结" : "Frozen"}</option>
          </select>
          <Button type="submit">{normalizedLocale === "zh" ? "筛选" : "Filter"}</Button>
        </form>
      </section>
      <UsersManager locale={normalizedLocale} initialUsers={result.users} />
    </main>
  );
}
