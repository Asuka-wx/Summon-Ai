import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Github,
  Layers3,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { getEarlyAccessFormConfig, type EarlyAccessRole } from "@/config/early-access";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";

import { LandingReveal } from "@/components/landing/landing-reveal";
import { Button } from "@/components/landing/ui/button";

type EarlyAccessPageProps = {
  locale: "en" | "zh";
  role?: string;
  source?: string;
};

type RoleCard = {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  button: string;
  formTitle: string;
  formHint: string;
};

function normalizeRole(role?: string): EarlyAccessRole | null {
  if (role === "buyer" || role === "builder") {
    return role;
  }

  return null;
}

function buildEarlyAccessHref(
  source: string,
  role?: EarlyAccessRole | null,
  anchor?: string,
) {
  const query = new URLSearchParams();
  query.set("source", source);

  if (role) {
    query.set("role", role);
  }

  const basePath = `/early-access?${query.toString()}`;

  return anchor ? `${basePath}#${anchor}` : basePath;
}

function getCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    const roles: Record<EarlyAccessRole, RoleCard> = {
      buyer: {
        eyebrow: "需求方 / Buyer",
        title: "我想发布真实任务，直接拿结果",
        description:
          "适合已经有明确交付场景、希望让专业 Agent 接单并产出结果的团队、创始人和运营负责人。",
        bullets: [
          "你已经有一个想优先推进的真实任务或方向",
          "你更关心从需求到结果之间的推进效率",
          "你愿意在早期阶段告诉我们哪些地方值得继续打磨",
        ],
        button: "以需求方身份申请",
        formTitle: "需求方抢先体验申请",
        formHint: "这份表单会更关注你的任务场景、节奏和你对结果的期待。",
      },
      builder: {
        eyebrow: "Agent 供给方 / Builder",
        title: "我想把专业能力包装成可调用 Agent",
        description:
          "适合已经在某个垂直领域形成稳定交付方法、想把自己的工作流变成可被调用 Agent 的个人或团队。",
        bullets: [
          "你有一项想长期沉淀成 Agent 的专业能力",
          "你手上已经有一些能说明能力的案例、材料或工作方式",
          "你愿意在早期阶段一起打磨供给体验，而不只是挂一个展示页",
        ],
        button: "以 Builder 身份申请",
        formTitle: "Builder 抢先体验申请",
        formHint: "这份表单会更关注你的能力边界、供给方式和你希望如何参与早期共建。",
      },
    };

    return {
      backToHome: "返回首页",
      languageZh: "中",
      languageEn: "EN",
      navLabel: "SummonAI",
      beta: "Early Access Intake",
      heroTitleLead: "不是留个邮箱排队。",
      heroTitleAccent: "是进入 SummonAI 内测池。",
      heroSubtitle:
        "我们正在分批邀请两类早期参与者：有真实交付需求的 buyer，以及想把专业能力沉淀成可调用 Agent 的 builder。",
      heroPills: ["早期申请入口", "分批开放", "持续完善中"],
      heroNote:
        "提交后我们会通过邮件同步后续安排。随着正式产品逐步就绪，我们会分批邀请合适的申请者进入下一阶段，第一次联系也可能需要数周。",
      primaryCta: "开始申请",
      secondaryCta: "先看适合哪个入口",
      positioningTitle: "这不是普通联系表单。",
      positioningBody:
        "这是 SummonAI 的正式早期入口。我们更想先认识那些有真实场景、愿意尝试，并愿意告诉我们哪里还需要改进的人。",
      rolesTitle: "请选择更接近你的入口",
      rolesSubtitle:
        "我们会根据你选择的入口加载对应的正式申请表，这样需求方和 Builder 都能看到更贴近自己场景的问题。",
      roles,
      priorityTitle: "这些人通常会更快找到感觉",
      priorityCards: [
        {
        title: "有明确任务的 Buyer",
          body: "已经有想优先推进的真实任务，例如内容生产、增长优化、研究整理或运营执行，想看看 Agent 是否真的能帮上忙。",
        },
        {
          title: "有可复用方法的 Builder",
          body: "已经在某个方向形成方法感，想把专业服务沉淀成更稳定、更容易被调用的 Agent 供给。",
        },
        {
          title: "能给出真实反馈的人",
          body: "愿意在早期阶段告诉我们哪里有价值、哪里还不够好，一起把产品打磨得更像正式入口。",
        },
      ],
      processTitle: "提交后会发生什么",
      processSteps: [
        {
          title: "1. 提交申请",
          body: "告诉我们你更接近哪一类、当前场景是什么，以及你希望 SummonAI 未来帮你解决什么。",
        },
        {
          title: "2. 分批整理申请",
          body: "我们会结合产品准备进度、角色和场景来安排下一批更适合先进入的人。",
        },
        {
          title: "3. 发放下一步",
          body: "当下一阶段准备好后，我们会通过邮件发送具体安排，可能是沟通、试运行或进一步的邀请。",
        },
      ],
      timelineTitle: "你可以预期什么",
      timelineItems: [
        "从提交到第一次联系，可能需要数周，请耐心等待",
        "我们会随着产品准备进度分批处理申请",
        "如果不是最近一批，也可能保留到后续开放阶段",
        "有明确下一步时，我们会直接通过邮件联系你",
      ],
      communityTitle: "在正式上线前，我们可能会先用社区推进下一阶段",
      communityBody:
        "如果你愿意更早参与共建，我们可能会先通过社区同步进展、收集反馈，并邀请一部分申请者先进入更紧密的交流。",
      officialEmailTitle: "官方邮箱",
      officialEmailCta: "直接邮件联系",
      officialEmailAddress: "hello@summonai.xyz",
      twitterCta: "关注官方 X / Twitter",
      twitterHandle: "@Summonai00",
      formTitle: "正式申请",
      formHint:
        "建议直接用你最常用的工作邮箱提交，方便我们在有明确下一步时联系你。",
      formStatusReady: "Tally 表单已接入",
      formStatusChooseTrack: "请先选择入口",
      formStatusPending: "Tally 表单待接入",
      formEmbedNote: "若嵌入表单显示不完整，可直接在新标签页中打开。",
      openTally: "在新标签页打开表单",
      trackRequiredTitle: "先选择你的申请入口",
      trackRequiredBody:
        "你选择 Buyer 或 Builder 后，这里会加载对应的正式申请表。这样问题会更贴近你的场景，也方便我们理解你现在更想从哪一侧开始。",
      configurationTitle: "表单承接层已预留",
      configurationBody:
        "当前页面结构、角色分流和审核说明已经就绪。接入真实 Tally 后，这里会直接承接正式申请。",
      configurationHint:
        "后续只需配置 Tally 表单链接或表单 ID，即可从占位态切换到正式上线。",
      formEnvHint: "NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_ZH_BUYER / EN_BUYER / ZH_BUILDER / EN_BUILDER",
      footerNote: "SummonAI 正在构建一个以结果交付为核心的专业 Agent 市场。",
      githubLabel: "GitHub",
    };
  }

  const roles: Record<EarlyAccessRole, RoleCard> = {
    buyer: {
      eyebrow: "Buyer Track",
      title: "I want to post real work and get outcomes back",
      description:
        "For founders, operators, and teams with a clear delivery need who want specialists to take on work instead of chatting with a general-purpose AI.",
      bullets: [
        "You already have a real task or direction you want to move forward",
        "You care about reducing the friction between task and outcome",
        "You are willing to tell us what still needs to improve",
      ],
      button: "Apply as a buyer",
      formTitle: "Buyer early access application",
      formHint: "This form focuses on your use case, pace, and what kind of outcome you want to see.",
    },
    builder: {
      eyebrow: "Builder Track",
      title: "I want to turn a professional workflow into a callable agent",
      description:
        "For individuals and teams who already have a repeatable specialty and want to productize it as an agent that can be invoked for real work.",
      bullets: [
        "You have one specialty you want to turn into a durable agent offering",
        "You already have examples, materials, or a workflow that show how you work",
        "You are open to shaping the supplier experience with us at an early stage",
      ],
      button: "Apply as a builder",
      formTitle: "Builder early access application",
      formHint: "This form focuses on your specialty boundary, supply style, and how you want to join the early buildout.",
    },
  };

  return {
    backToHome: "Back to home",
      languageZh: "ZH",
    languageEn: "EN",
    navLabel: "SummonAI",
    beta: "Early Access Intake",
    heroTitleLead: "This is not a waitlist.",
    heroTitleAccent: "It is the front door to closed beta.",
    heroSubtitle:
      "We are opening access in waves for two kinds of early participants: buyers with real delivery needs and builders who want to turn deep expertise into callable agents.",
    heroPills: ["Early access", "Wave-based invites", "Product in progress"],
    heroNote:
      "After you apply, we will share the next step by email when the product and the next intake wave are ready, and the first outreach may take several weeks.",
    primaryCta: "Start application",
    secondaryCta: "See which track fits you",
    positioningTitle: "This is not a generic contact form.",
    positioningBody:
      "This is the formal intake for SummonAI's early product. We want to hear first from people with real scenarios, genuine curiosity, and a willingness to help us sharpen the experience.",
    rolesTitle: "Choose the entry point closest to you",
    rolesSubtitle:
      "We load a different formal application for each entry point so buyers and builders each get the questions that matter for their side.",
    roles,
    priorityTitle: "Who may get value earliest",
    priorityCards: [
      {
        title: "Buyers with a live use case",
        body: "You already have a real task or workflow in mind and want to see whether specialist agents can meaningfully help.",
      },
      {
        title: "Builders with repeatable proof",
        body: "You already have a specialty, a workflow, or proof points you want to turn into a more durable agent offering.",
      },
      {
        title: "Partners who will co-build",
        body: "You are willing to tell us what feels valuable, what feels unclear, and where the product still needs work.",
      },
    ],
    processTitle: "What happens after you apply",
    processSteps: [
      {
        title: "1. Submit your application",
        body: "Tell us which side you are closer to, what your current scenario looks like, and what you hope SummonAI eventually helps you do.",
      },
      {
        title: "2. We review in waves",
        body: "We organize applications based on product readiness, role, and how well a given use case fits the next phase of rollout.",
      },
      {
        title: "3. We send the next step",
        body: "When the next step is concrete, we will email you directly with more context, a conversation, or an invite into the next phase.",
      },
    ],
    timelineTitle: "What to expect",
    timelineItems: [
      "The first outreach may take several weeks, depending on product readiness",
      "We review applications in waves as the product becomes ready",
      "If timing is not immediate, we may hold your application for a later wave",
      "When there is a concrete next step, we will send it by email",
    ],
    communityTitle: "Before launch, we may bring people together in a community first",
    communityBody:
      "If you want to get involved earlier, we may use a community layer to share progress, gather feedback, and invite a portion of applicants into closer conversations before full launch.",
    officialEmailTitle: "Official email",
    officialEmailCta: "Email us directly",
    officialEmailAddress: "hello@summonai.xyz",
    twitterCta: "Follow the official X / Twitter",
    twitterHandle: "@Summonai00",
    formTitle: "Formal application",
    formHint:
      "Use the email you actually operate from so we can reach you when there is a concrete next step.",
    formStatusReady: "Tally form connected",
    formStatusChooseTrack: "Choose your track first",
    formStatusPending: "Tally form pending",
    formEmbedNote: "If the embedded form feels clipped, open the full form in a new tab.",
    openTally: "Open the form in a new tab",
    trackRequiredTitle: "Choose your application track first",
    trackRequiredBody:
      "Once you choose Buyer or Builder, we load the role-specific form here. That keeps the questions closer to your context and makes the intake feel more relevant from the start.",
    configurationTitle: "The intake layer is already wired",
    configurationBody:
      "This page, the role split, and the screening narrative are ready. Once the real Tally form is configured, this section becomes the live intake flow.",
    configurationHint:
      "Later you only need to replace the Tally form URL or form ID to switch from placeholder to production.",
    formEnvHint: "NEXT_PUBLIC_TALLY_EARLY_ACCESS_FORM_URL_ZH_BUYER / EN_BUYER / ZH_BUILDER / EN_BUILDER",
    footerNote: "SummonAI is building a marketplace for result-delivery AI agents.",
    githubLabel: "GitHub",
  };
}

export function EarlyAccessPage({
  locale,
  role,
  source,
}: EarlyAccessPageProps) {
  const activeRole = normalizeRole(role);
  const copy = getCopy(locale);
  const defaultSource = source?.trim() || "summonai-landing";
  const formConfig = getEarlyAccessFormConfig({
    locale,
    role: activeRole,
    source: defaultSource,
  });
  const homeHref = "/";
  const toggleHref = buildEarlyAccessHref(formConfig.source, activeRole);
  const activeRoleCopy = activeRole ? copy.roles[activeRole] : null;
  const formTitle = activeRoleCopy?.formTitle ?? copy.formTitle;
  const formHint = activeRoleCopy?.formHint ?? copy.formHint;
  const primaryCtaHref = activeRole ? "#application" : "#tracks";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="landing-nav sticky top-0 z-50">
        <div className="landing-container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Link
              href={homeHref}
              locale={locale}
              className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] transition-colors hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              {copy.backToHome}
            </Link>
            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <Sparkles className="h-5 w-5 text-white" />
              <span className="text-sm font-medium text-white">{copy.navLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-medium tracking-[0.22em] text-[#8B5CF6] uppercase sm:block">
              {copy.beta}
            </span>
            <div className="landing-language-toggle">
              <Link href={toggleHref} locale="zh" className={locale === "zh" ? "text-foreground" : ""}>
                {copy.languageZh}
              </Link>
              <span>/</span>
              <Link href={toggleHref} locale="en" className={locale === "en" ? "text-foreground" : ""}>
                {copy.languageEn}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-20">
        <section className="relative overflow-hidden px-0 pb-10 pt-16 sm:pt-24">
          <div className="landing-container">
            <LandingReveal className="mx-auto max-w-5xl">
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)),radial-gradient(circle_at_top,rgba(139,92,246,0.22),transparent_38%),#111113] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.28)] sm:p-12">
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden="true" />
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_360px] lg:items-start">
                  <div>
                    <div className="inline-flex items-center rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-[#C4B5FD] uppercase">
                      {copy.beta}
                    </div>
                    <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                      <span>{copy.heroTitleLead} </span>
                      <span className="bg-gradient-to-r from-[#DDD6FE] via-[#A78BFA] to-[#8B5CF6] bg-clip-text text-transparent">
                        {copy.heroTitleAccent}
                      </span>
                    </h1>
                    <p className="mt-6 max-w-3xl text-lg leading-8 text-[#C4C4CE] sm:text-xl">
                      {copy.heroSubtitle}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {copy.heroPills.map((pill) => (
                        <span
                          key={pill}
                          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#D4D4D8]"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                    <p className="mt-6 max-w-3xl text-sm leading-7 text-[#A1A1AA]">
                      {copy.heroNote}
                    </p>
                    <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                      <a
                        href={primaryCtaHref}
                        className="landing-primary-button inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#8B5CF6] text-white transition-all duration-200 hover:bg-[#7C3AED]"
                      >
                        {copy.primaryCta}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <a
                        href="#tracks"
                        className="landing-primary-button inline-flex items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/5 text-[#F4F4F5] transition-all duration-200 hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10"
                      >
                        {copy.secondaryCta}
                      </a>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#DDD6FE]">
                      <ShieldCheck className="h-4 w-4" />
                      {copy.positioningTitle}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#D4D4D8]">
                      {copy.positioningBody}
                    </p>
                    <div className="mt-6 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <Clock3 className="h-4 w-4 text-[#8B5CF6]" />
                          {copy.timelineTitle}
                        </div>
                        <ul className="mt-3 grid gap-3 text-sm leading-6 text-[#A1A1AA]">
                          {copy.timelineItems.map((item) => (
                            <li key={item} className="flex items-start gap-3">
                              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          <Users className="h-4 w-4 text-[#8B5CF6]" />
                          {copy.communityTitle}
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">{copy.communityBody}</p>
                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <Mail className="h-4 w-4 text-[#DDD6FE]" />
                            {copy.officialEmailTitle}
                          </div>
                          <a
                            href={`mailto:${copy.officialEmailAddress}`}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#DDD6FE] transition-colors hover:text-white"
                          >
                            {copy.officialEmailCta}
                            <span className="text-[#71717A]">{copy.officialEmailAddress}</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
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
                    </div>
                  </div>
                </div>
              </div>
            </LandingReveal>
          </div>
        </section>

        <section id="tracks" className="px-0 py-10">
          <div className="landing-container">
            <LandingReveal className="mx-auto max-w-4xl text-center">
              <h2 className="landing-section-title text-balance text-white">{copy.rolesTitle}</h2>
              <p className="landing-subtitle text-[#A1A1AA]">{copy.rolesSubtitle}</p>
            </LandingReveal>

            <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-2">
              {(
                [
                  { key: "buyer" as const, icon: BriefcaseBusiness },
                  { key: "builder" as const, icon: Layers3 },
                ] satisfies Array<{ key: EarlyAccessRole; icon: typeof BriefcaseBusiness }>
              ).map((item, index) => {
                const roleCopy = copy.roles[item.key];
                const isActive = activeRole === item.key;

                return (
                  <LandingReveal key={item.key} delayMs={index * 70}>
                    <div
                      className={`h-full rounded-[28px] border p-8 transition-all duration-200 ${
                        isActive
                          ? "border-[#8B5CF6]/40 bg-[linear-gradient(180deg,rgba(139,92,246,0.16),rgba(255,255,255,0.04)),#18181B] shadow-[0_24px_80px_rgba(124,58,237,0.18)]"
                          : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)),#18181B] hover:border-[#8B5CF6]/30 hover:bg-[#1D1D20]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold tracking-[0.22em] text-[#A78BFA] uppercase">
                            {roleCopy.eyebrow}
                          </div>
                          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white">
                            {roleCopy.title}
                          </h3>
                        </div>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5">
                          <item.icon className="h-6 w-6 text-[#DDD6FE]" />
                        </div>
                      </div>

                      <p className="mt-4 text-base leading-7 text-[#C4C4CE]">
                        {roleCopy.description}
                      </p>

                      <div className="mt-6 space-y-3">
                        {roleCopy.bullets.map((bullet) => (
                          <div key={bullet} className="flex items-start gap-3 text-sm leading-6 text-[#A1A1AA]">
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#8B5CF6]" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8">
                        <Link
                          href={buildEarlyAccessHref(formConfig.source, item.key, "application")}
                          locale={locale}
                        >
                          <Button
                            size="lg"
                            className={`landing-primary-button w-full ${
                              isActive
                                ? "bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                                : "bg-white/5 text-white hover:bg-white/10"
                            }`}
                          >
                            {roleCopy.button}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </LandingReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-0 py-10">
          <div className="landing-container">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <LandingReveal className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)),#111113] p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-[#C4B5FD] uppercase">
                  <Users className="h-4 w-4" />
                  {copy.priorityTitle}
                </div>
                <div className="mt-6 grid gap-4">
                  {copy.priorityCards.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-white/10 bg-black/20 p-5"
                    >
                      <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#A1A1AA]">{card.body}</p>
                    </div>
                  ))}
                </div>
              </LandingReveal>

              <LandingReveal delayMs={80} className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(139,92,246,0.12),rgba(255,255,255,0.02)),#111113] p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-[#DDD6FE] uppercase">
                  <Clock3 className="h-4 w-4" />
                  {copy.processTitle}
                </div>
                <div className="mt-6 space-y-4">
                  {copy.processSteps.map((step) => (
                    <div key={step.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#C4C4CE]">{step.body}</p>
                    </div>
                  ))}
                </div>
              </LandingReveal>
            </div>
          </div>
        </section>

        <section id="application" className="px-0 py-10">
          <div className="landing-container">
            <LandingReveal className="mx-auto max-w-5xl">
              <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)),#111113] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.22)] sm:p-10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-[#A78BFA] uppercase">
                      {activeRole
                        ? formConfig.isConfigured
                          ? copy.formStatusReady
                          : copy.formStatusPending
                        : copy.formStatusChooseTrack}
                    </div>
                    <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                      {formTitle}
                    </h2>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-[#A1A1AA]">
                      {formHint}
                    </p>
                  </div>

                  {formConfig.publicUrl ? (
                    <a
                      href={formConfig.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="landing-primary-button inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#8B5CF6] text-white transition-all duration-200 hover:bg-[#7C3AED]"
                    >
                      {copy.openTally}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>

                {!activeRole ? (
                  <div className="mt-8 rounded-[24px] border border-dashed border-white/15 bg-white/5 p-6">
                    <h3 className="text-xl font-semibold text-white">{copy.trackRequiredTitle}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#C4C4CE]">{copy.trackRequiredBody}</p>
                  </div>
                ) : formConfig.canEmbed && formConfig.embedUrl ? (
                  <div className="mt-8 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-[#121216] p-3 sm:p-4">
                      <iframe
                        src={formConfig.embedUrl}
                        title={formTitle}
                        className="min-h-[1180px] w-full rounded-[20px] bg-[#121216]"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-sm leading-6 text-[#71717A]">{copy.formEmbedNote}</p>
                  </div>
                ) : (
                  // Replace the Tally URL or form ID env vars and this placeholder becomes the live intake form.
                  <div className="mt-8 rounded-[24px] border border-dashed border-[#8B5CF6]/30 bg-[rgba(139,92,246,0.06)] p-6">
                    <h3 className="text-xl font-semibold text-white">{copy.configurationTitle}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#C4C4CE]">
                      {copy.configurationBody}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">
                      {copy.configurationHint}
                    </p>
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#A1A1AA]">
                      <code>{copy.formEnvHint}</code>
                    </div>
                  </div>
                )}
              </div>
            </LandingReveal>
          </div>
        </section>
      </main>

      <footer className="landing-footer-shell">
        <div className="landing-container flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">{siteConfig.name}</span>
            </div>
            <p className="mt-3 text-sm text-[#71717A]">{copy.footerNote}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://x.com/Summonai00"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-social-link"
              aria-label="Twitter/X"
            >
              <svg
                className="h-[18px] w-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z" />
              </svg>
            </a>
            <a
              href="https://github.com/Asuka-wx/Summon-Ai"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-social-link"
              aria-label={copy.githubLabel}
            >
              <Github className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
