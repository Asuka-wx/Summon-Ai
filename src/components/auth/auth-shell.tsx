import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  locale: "en" | "zh";
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const COPY = {
  en: {
    backHome: "Back to home",
  },
  zh: {
    backHome: "返回主页",
  },
} as const;

export function AuthShell({
  locale,
  children,
  className,
  contentClassName,
}: AuthShellProps) {
  const copy = COPY[locale];

  return (
    <main
      className={cn(
        "relative isolate flex min-h-screen flex-col overflow-hidden bg-[#09090B] text-white",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,0.14),transparent_24%)]" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-6%] h-72 w-72 rounded-full bg-[rgba(139,92,246,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute top-[22%] right-[-8%] h-64 w-64 rounded-full bg-[rgba(139,92,246,0.06)] blur-3xl" />

      <header className="relative z-10 border-b border-white/8 bg-[rgba(9,9,11,0.72)] backdrop-blur-[18px]">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-5">
          <Link href="/" locale={locale} className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-white" />
            <span className="text-[15px] font-medium text-white">SummonAI</span>
          </Link>

          <Link
            href="/"
            locale={locale}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/72 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            {copy.backHome}
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex min-h-[calc(100vh-77px)] w-full max-w-[1280px] flex-1 items-center justify-center px-6 py-8 lg:px-8">
        <div className={cn("w-full max-w-[980px]", contentClassName)}>{children}</div>
      </div>
    </main>
  );
}
