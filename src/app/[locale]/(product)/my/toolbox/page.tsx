import { ToolboxPanel } from "@/components/my/toolbox-panel";
import { listUserToolbox } from "@/lib/users/engagement";
import { requirePageUser } from "@/lib/server/page-auth";

type MyToolboxPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MyToolboxPage({ params }: MyToolboxPageProps) {
  const { locale } = await params;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const userId = await requirePageUser(normalizedLocale);
  const items = await listUserToolbox(userId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {normalizedLocale === "zh" ? "Agent 工具箱" : "Agent Toolbox"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {normalizedLocale === "zh"
            ? "快速回到你常用的 Agent"
            : "Jump back into the agents you use most"}
        </h1>
      </section>

      <ToolboxPanel locale={normalizedLocale} items={items} />
    </main>
  );
}
