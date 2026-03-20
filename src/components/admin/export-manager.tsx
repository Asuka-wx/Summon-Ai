"use client";

import { Button } from "@/components/ui/button";

type ExportManagerProps = {
  locale: "en" | "zh";
  items: readonly string[];
};

export function ExportManager({ locale, items }: ExportManagerProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <section
          key={item}
          className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-lg shadow-primary/5"
        >
          <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">{item}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === "zh" ? "导出当前数据快照" : "Download the current CSV snapshot"}
          </p>
          <Button
            className="mt-4"
            type="button"
            variant="outline"
            onClick={() => window.location.assign(`/api/v1/admin/export/${item}`)}
          >
            {locale === "zh" ? "下载 CSV" : "Download CSV"}
          </Button>
        </section>
      ))}
    </div>
  );
}
