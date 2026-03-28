import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ProductEntryCanvasProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ProductEntryCanvas({
  children,
  className,
  contentClassName,
}: ProductEntryCanvasProps) {
  return (
    <main
      className={cn(
        "dark relative isolate overflow-hidden bg-[#09090B] text-white",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.2),transparent_56%)]" />
      <div className="pointer-events-none absolute left-1/2 top-28 h-80 w-80 -translate-x-1/2 rounded-full bg-[rgba(250,245,255,0.06)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[rgba(139,92,246,0.08)] blur-3xl" />
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 lg:px-8",
          contentClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}
