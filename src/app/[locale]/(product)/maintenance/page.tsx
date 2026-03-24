type MaintenancePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function MaintenancePage({ params }: MaintenancePageProps) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl items-center px-6 py-12 lg:px-8">
      <section className="w-full rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-2xl shadow-primary/10">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {isZh ? "维护模式" : "Maintenance"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-foreground">
          {isZh ? "平台正在维护中" : "The platform is currently under maintenance"}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
          {isZh
            ? "新的广播与任务创建会暂时关闭，进行中的任务会继续自然结束。你可以稍后再回来，或通过社群获取恢复通知。"
            : "New broadcasts and task creation are temporarily unavailable while ongoing work continues naturally. Please check back shortly for normal access."}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {isZh ? "状态" : "Status"}
            </p>
            <p className="mt-3 text-sm text-foreground">
              {isZh ? "维护进行中，任务室会显示不中断提示。" : "Maintenance in progress. Existing task rooms remain available."}
            </p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/75 p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {isZh ? "建议" : "Next step"}
            </p>
            <p className="mt-3 text-sm text-foreground">
              {isZh ? "请稍后刷新，或返回首页继续浏览公开内容。" : "Refresh later, or return home to continue browsing public pages."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
