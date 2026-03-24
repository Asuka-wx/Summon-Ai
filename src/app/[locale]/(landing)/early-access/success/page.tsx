import { CheckCircle2, ChevronLeft, Clock3, ExternalLink, Mail, Sparkles, Users } from "lucide-react";

import { Link } from "@/i18n/navigation";

type EarlyAccessSuccessPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    role?: string | string[];
    source?: string | string[];
  }>;
};

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EarlyAccessSuccessPage({
  params,
  searchParams,
}: EarlyAccessSuccessPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const normalizedLocale = locale === "zh" ? "zh" : "en";
  const role = readSearchParam(query.role);
  const source = readSearchParam(query.source);
  const isBuyer = role === "buyer";
  const isBuilder = role === "builder";

  const copy =
    normalizedLocale === "zh"
      ? {
          back: "返回申请页",
          title: "申请已提交。",
          subtitle:
            "你的申请已经进入 SummonAI 的早期申请池。随着正式产品逐步完善，我们会按阶段整理申请并通过邮件同步下一步。",
          timelineTitle: "接下来会发生什么",
          timelineItems: [
            "从提交到第一次联系，可能需要数周，这通常取决于产品准备进度",
            "我们会随着产品准备进度分批整理申请",
            "如果进入下一阶段，我们会通过邮件发送具体安排",
            "如果不是最近一批，也可能保留到后续开放阶段",
          ],
          roleTitle: isBuyer
            ? "你以需求方身份提交了申请"
            : isBuilder
              ? "你以 Builder 身份提交了申请"
              : "你的申请已经进入 SummonAI 内测池",
          roleBody: isBuyer
            ? "我们会更关注你的任务场景、实际需求强度，以及你希望 Agent 帮你把哪部分工作更快推进。"
            : isBuilder
              ? "我们会更关注你的能力边界、供给方式、证明材料，以及你是否愿意参与早期共建。"
              : "我们会结合你的角色、使用成熟度和参与意愿来安排后续节奏。",
          sourceLabel: "提交来源",
          sourceValue: source ?? "summonai-landing",
          emailTitle: "请留意你的邮箱",
          emailBody:
            "当我们有明确下一步时，会直接通过你提交的邮箱联系你。你不需要额外追踪其他入口或页面。",
          officialEmailTitle: "如果你希望主动联系",
          officialEmailCta: "发送邮件到",
          officialEmailAddress: "hello@summonai.xyz",
          communityTitle: "我们也可能先通过社区推进下一阶段",
          communityBody:
            "在正式产品上线前，我们可能会先建立社区来同步进展、收集反馈，并邀请一部分申请者更早参与共建。",
          twitterCta: "关注官方 X / Twitter",
          twitterHandle: "@Summonai00",
          home: "返回首页",
          reapply: "查看其他入口",
        }
      : {
          back: "Back to application",
          title: "Application received.",
          subtitle:
            "Your application is now in the SummonAI early access pool. As the product becomes more ready, we will review applications in stages and share the next step by email.",
          timelineTitle: "What happens next",
          timelineItems: [
            "The first outreach may take several weeks, depending on product readiness",
            "We review applications in waves as the product becomes ready",
            "If you move into the next phase, we will email you directly with the details",
            "If timing is not immediate, we may keep your application for a later wave",
          ],
          roleTitle: isBuyer
            ? "You applied through the buyer track"
            : isBuilder
              ? "You applied through the builder track"
              : "Your application is now in the SummonAI beta pool",
          roleBody: isBuyer
            ? "We will look at your use case, the strength of the underlying need, and what kind of work you want agents to help move faster."
            : isBuilder
              ? "We will look at your capability boundary, supply style, proof materials, and whether you want to help shape the early supplier experience."
              : "We will use your role, usage maturity, and willingness to participate to shape the next step.",
          sourceLabel: "Submission source",
          sourceValue: source ?? "summonai-landing",
          emailTitle: "Watch your inbox",
          emailBody:
            "When there is a concrete next step, we will email it to you directly, so there is nothing extra you need to track on your own.",
          officialEmailTitle: "If you want to reach out directly",
          officialEmailCta: "Email",
          officialEmailAddress: "hello@summonai.xyz",
          communityTitle: "We may also use a community layer before full launch",
          communityBody:
            "Before the full product is ready, we may bring applicants together in a community to share progress, gather feedback, and invite some people into closer collaboration earlier.",
          twitterCta: "Follow the official X / Twitter",
          twitterHandle: "@Summonai00",
          home: "Back to home",
          reapply: "See other track",
        };

  return (
    <main className="min-h-screen bg-background px-0 py-10 text-foreground sm:py-16">
      <div className="landing-container">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/early-access"
            locale={normalizedLocale}
            className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {copy.back}
          </Link>

          <div className="mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)),radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_42%),#111113] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.24)] sm:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-[#C4B5FD] uppercase">
              <Sparkles className="h-4 w-4" />
              Closed Beta Intake
            </div>

            <div className="mt-6 flex items-center gap-3 text-[#86EFAC]">
              <CheckCircle2 className="h-7 w-7" />
              <span className="text-sm font-medium uppercase tracking-[0.2em]">
                {normalizedLocale === "zh" ? "已收到申请" : "Application received"}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#C4C4CE]">
              {copy.subtitle}
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_320px]">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold text-white">{copy.roleTitle}</h2>
                <p className="mt-3 text-sm leading-7 text-[#C4C4CE]">{copy.roleBody}</p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold tracking-[0.22em] text-[#A78BFA] uppercase">
                    {copy.sourceLabel}
                  </div>
                  <p className="mt-2 text-sm text-[#F4F4F5]">{copy.sourceValue}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Clock3 className="h-4 w-4 text-[#8B5CF6]" />
                  {copy.timelineTitle}
                </div>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-[#A1A1AA]">
                  {copy.timelineItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(139,92,246,0.12),rgba(255,255,255,0.02)),#111113] p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Mail className="h-4 w-4 text-[#DDD6FE]" />
                {copy.emailTitle}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#C4C4CE]">{copy.emailBody}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[#A1A1AA]">
                <span>{copy.officialEmailTitle}</span>
                <a
                  href={`mailto:${copy.officialEmailAddress}`}
                  className="inline-flex items-center gap-2 font-medium text-[#DDD6FE] transition-colors hover:text-white"
                >
                  {copy.officialEmailCta}
                  <span className="text-[#71717A]">{copy.officialEmailAddress}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Users className="h-4 w-4 text-[#8B5CF6]" />
                {copy.communityTitle}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#C4C4CE]">{copy.communityBody}</p>
              <a
                href="https://x.com/Summonai00"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#DDD6FE] transition-colors hover:text-white"
              >
                {copy.twitterCta}
                <span className="text-[#71717A]">{copy.twitterHandle}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/"
                locale={normalizedLocale}
                className="landing-primary-button inline-flex items-center justify-center rounded-[12px] bg-[#8B5CF6] text-white transition-all duration-200 hover:bg-[#7C3AED]"
              >
                {copy.home}
              </Link>
              <Link
                href="/early-access#tracks"
                locale={normalizedLocale}
                className="landing-primary-button inline-flex items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-[#F4F4F5] transition-all duration-200 hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10"
              >
                {copy.reapply}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
