import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Compass,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";

import { ProductEntryCanvas } from "@/components/product/product-entry-canvas";
import { Link } from "@/i18n/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProductAccessState } from "@/lib/server/product-access";

type AppEntryPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

type QuickAction = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type WorkspaceCard = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  meta?: string | null;
};

type AppCopy = {
  eyebrow: string;
  title: string;
  description: string;
  heroBadge: string;
  heroBadgeAdmin: string;
  heroNote: string;
  accountLabel: string;
  accountValue: string;
  activationLabel: string;
  activationValue: string;
  activationAdminValue: string;
  roleLabel: string;
  roleMemberValue: string;
  roleAdminValue: string;
  quickActionsTitle: string;
  quickActionsDescription: string;
  workspaceTitle: string;
  workspaceDescription: string;
  statusTitle: string;
  statusDescription: string;
  stateAgents: string;
  stateNotifications: string;
  adminPanelTitle: string;
  adminPanelDescription: string;
  quickActions: QuickAction[];
  workspaces: WorkspaceCard[];
  adminCard: {
    title: string;
    href: string;
    icon: LucideIcon;
  };
};

function getCopy(locale: "en" | "zh"): AppCopy {
  if (locale === "zh") {
    return {
      eyebrow: "SummonAI Product Hall",
      title: "从一个清晰入口，继续你的产品流程。",
      description:
        "在同一个账户之下，你可以继续雇佣专家、运营自己的 Agent、处理通知与账户事项，而不需要在不同模式之间来回切换。",
      heroBadge: "Closed beta access",
      heroBadgeAdmin: "Admin access",
      heroNote: "把 hiring、运营和账户动作放在同一个入口里，会比拆成多套入口更顺手。",
      accountLabel: "账户状态",
      accountValue: "已登录",
      activationLabel: "访问状态",
      activationValue: "邀请码已生效",
      activationAdminValue: "Admin 权限已启用",
      roleLabel: "账户角色",
      roleMemberValue: "标准成员",
      roleAdminValue: "管理员",
      quickActionsTitle: "先继续最重要的下一步",
      quickActionsDescription:
        "这里优先承接进入产品后最真实的动作，而不是先把你丢进一组抽象导航。",
      workspaceTitle: "工作区入口",
      workspaceDescription:
        "这些入口覆盖 hiring、运营与账户管理三类常用动作，并继续沿用 landing 家族的视觉语言。",
      statusTitle: "当前活动",
      statusDescription: "快速确认和这个账户最相关的产品状态。",
      stateAgents: "我的 Agent",
      stateNotifications: "未读通知",
      adminPanelTitle: "继续进入 Admin Console",
      adminPanelDescription:
        "如果当前账户具备 admin 权限，这里会保留内部控制台入口，不再额外制造公开入口分叉。",
      quickActions: [
        {
          key: "toolbox",
          title: "继续我的任务",
          description: "回到最稳定、最常用的工作台，继续已有协作与执行。",
          href: "/my/toolbox",
          icon: Sparkles,
        },
        {
          key: "showcase",
          title: "浏览可用专家",
          description: "查看当前可雇佣的专家与 Agent 展示页。",
          href: "/showcase",
          icon: Compass,
        },
        {
          key: "dashboard",
          title: "打开 Seller Dashboard",
          description: "从统一入口继续进入供给侧工作台，管理你的 Agent 业务。",
          href: "/dashboard",
          icon: BriefcaseBusiness,
        },
      ],
      workspaces: [
        {
          key: "toolbox",
          eyebrow: "Buyer / Reuse",
          title: "Agent Toolbox",
          description: "回到你最常使用的 Agent、素材与复用工作流。",
          href: "/my/toolbox",
          icon: Sparkles,
        },
        {
          key: "new-agent",
          eyebrow: "Seller / Onboarding",
          title: "Launch a New Agent",
          description: "继续 seller 侧的新 Agent 上架与准备流程。",
          href: "/dashboard/agents/new",
          icon: BriefcaseBusiness,
        },
        {
          key: "connect-lab",
          eyebrow: "Seller / Runtime",
          title: "Validate Runtime Setup",
          description: "继续检查 connect lab、streaming 与运行时准备状态。",
          href: "/dashboard/connect-lab",
          icon: ShieldCheck,
        },
        {
          key: "notifications",
          eyebrow: "Account / Alerts",
          title: "Notifications",
          description: "查看平台提醒、任务推进与待处理动作。",
          href: "/my/notifications",
          icon: Bell,
        },
        {
          key: "settings",
          eyebrow: "Account / Settings",
          title: "Settings",
          description: "管理资料、偏好与账户相关设置。",
          href: "/my/settings",
          icon: Sparkles,
        },
        {
          key: "deposit",
          eyebrow: "Account / Wallet",
          title: "Deposit Balance",
          description: "准备余额与支付状态，承接后续任务消费。",
          href: "/my/deposit",
          icon: Wallet,
        },
      ],
      adminCard: {
        title: "打开 Admin Console",
        href: "/admin",
        icon: ShieldCheck,
      },
    };
  }

  return {
    eyebrow: "SummonAI Product Hall",
    title: "Continue the product from one clear starting point.",
    description:
      "From the same account, you can hire specialists, manage your own agent work, handle notifications, and move across product modes without splitting the experience.",
    heroBadge: "Closed beta access",
    heroBadgeAdmin: "Admin access",
    heroNote:
      "Keeping hiring, operating, and account tasks close in one entry feels more natural than splitting the product into separate front doors.",
    accountLabel: "Account state",
    accountValue: "Signed in",
    activationLabel: "Access state",
    activationValue: "Invite redeemed",
    activationAdminValue: "Admin access enabled",
    roleLabel: "Account role",
    roleMemberValue: "Member",
    roleAdminValue: "Administrator",
    quickActionsTitle: "Pick up the most important next step",
    quickActionsDescription:
      "This hall should surface concrete next actions first instead of dropping you into abstract navigation.",
    workspaceTitle: "Workspace entry points",
    workspaceDescription:
      "These entry points cover hiring, operating, and account management while staying inside the same visual language as the landing family.",
    statusTitle: "Current activity",
    statusDescription: "A quick read on the state that matters most for this account right now.",
    stateAgents: "My agents",
    stateNotifications: "Unread notifications",
    adminPanelTitle: "Continue into the Admin Console",
    adminPanelDescription:
      "If this account has admin permission, the internal console stays available from the same product entry without creating a separate public path.",
    quickActions: [
      {
        key: "toolbox",
        title: "Continue My Work",
        description: "Jump back into the most stable workspace for ongoing collaboration and execution.",
        href: "/my/toolbox",
        icon: Sparkles,
      },
      {
        key: "showcase",
        title: "Explore Specialists",
        description: "Browse the current showcase of hireable specialists and agents.",
        href: "/showcase",
        icon: Compass,
      },
      {
        key: "dashboard",
        title: "Open Seller Dashboard",
        description: "Continue into the supply-side workspace from the same unified product entry.",
        href: "/dashboard",
        icon: BriefcaseBusiness,
      },
    ],
    workspaces: [
      {
        key: "toolbox",
        eyebrow: "Buyer / Reuse",
        title: "Agent Toolbox",
        description: "Return to the agents, assets, and reusable workflows you rely on most.",
        href: "/my/toolbox",
        icon: Sparkles,
      },
      {
        key: "new-agent",
        eyebrow: "Seller / Onboarding",
        title: "Launch a New Agent",
        description: "Continue the seller setup flow for publishing a new agent.",
        href: "/dashboard/agents/new",
        icon: BriefcaseBusiness,
      },
      {
        key: "connect-lab",
        eyebrow: "Seller / Runtime",
        title: "Validate Runtime Setup",
        description: "Continue through connect lab, streaming, and runtime readiness checks.",
        href: "/dashboard/connect-lab",
        icon: ShieldCheck,
      },
      {
        key: "notifications",
        eyebrow: "Account / Alerts",
        title: "Notifications",
        description: "Review alerts, task movement, and the actions that still need attention.",
        href: "/my/notifications",
        icon: Bell,
      },
      {
        key: "settings",
        eyebrow: "Account / Settings",
        title: "Settings",
        description: "Manage profile details, preferences, and account-level controls.",
        href: "/my/settings",
        icon: Sparkles,
      },
      {
        key: "deposit",
        eyebrow: "Account / Wallet",
        title: "Deposit Balance",
        description: "Prepare payment state and balance before the next round of work.",
        href: "/my/deposit",
        icon: Wallet,
      },
    ],
    adminCard: {
      title: "Open Admin Console",
      href: "/admin",
      icon: ShieldCheck,
    },
  };
}

export default async function AppEntryPage({ params }: AppEntryPageProps) {
  const { locale } = await params;
  const normalizedLocale: "en" | "zh" = locale === "zh" ? "zh" : "en";
  const accessState = await getProductAccessState();

  if (!accessState.isSignedIn) {
    redirect(`/${normalizedLocale}/login?next=${encodeURIComponent(`/${normalizedLocale}/app`)}`);
  }

  if (accessState.requiresActivation) {
    redirect(
      `/${normalizedLocale}/activate?redirect=${encodeURIComponent(`/${normalizedLocale}/app`)}`,
    );
  }

  const copy = getCopy(normalizedLocale);
  const supabase = createAdminClient();
  const [{ count: notificationCount }, { count: agentCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", accessState.userId)
      .eq("is_read", false),
    supabase
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", accessState.userId),
  ]);

  const workspaceCards: WorkspaceCard[] = copy.workspaces.map((card) => {
    if (card.key === "notifications") {
      return {
        ...card,
        meta: `${copy.stateNotifications}: ${notificationCount ?? 0}`,
      };
    }

    if (card.key === "new-agent") {
      return {
        ...card,
        meta: `${copy.stateAgents}: ${agentCount ?? 0}`,
      };
    }

    return card;
  });

  return (
    <ProductEntryCanvas contentClassName="gap-8">
      <section className="relative overflow-hidden rounded-[2.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_34%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(17,17,20,0.96))] px-8 py-9 shadow-[0_36px_140px_-60px_rgba(139,92,246,0.55)] lg:px-10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_320px] lg:items-end">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold tracking-[0.28em] text-white/70 uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/72">
              {copy.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white/88">
                {accessState.isAdmin ? copy.heroBadgeAdmin : copy.heroBadge}
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65">
                {accessState.email ?? accessState.userId}
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-white/56">{copy.heroNote}</p>
          </div>

          <div className="grid gap-3 rounded-[2.1rem] border border-white/10 bg-black/24 p-5 backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
                {copy.accountLabel}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{copy.accountValue}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
                {copy.activationLabel}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {accessState.isAdmin ? copy.activationAdminValue : copy.activationValue}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
                {copy.roleLabel}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {accessState.isAdmin ? copy.roleAdminValue : copy.roleMemberValue}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_90px_-54px_rgba(139,92,246,0.3)]">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.24em] text-white/72 uppercase">
            {copy.quickActionsTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-white/58">{copy.quickActionsDescription}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {copy.quickActions.map((action) => (
            <Link
              key={action.key}
              href={action.href}
              locale={normalizedLocale}
              className="group rounded-[1.8rem] border border-white/10 bg-white/[0.06] p-6 shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <action.icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-4 w-4 text-white/45 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/80" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
                {action.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/62">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <div className="grid gap-5 rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-7 shadow-[0_24px_90px_-56px_rgba(139,92,246,0.24)]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.24em] text-white/72 uppercase">
              {copy.workspaceTitle}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/58">{copy.workspaceDescription}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {workspaceCards.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                locale={normalizedLocale}
                className="group rounded-[1.8rem] border border-white/10 bg-white/[0.06] p-5 shadow-lg shadow-black/10 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.09]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <card.icon className="h-5 w-5" />
                  </div>
                  {card.meta ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-medium text-white/80">
                      {card.meta}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-[11px] font-semibold tracking-[0.22em] text-white/52 uppercase">
                  {card.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/62">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <aside className="grid gap-5">
          <section className="rounded-[2.25rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_-56px_rgba(139,92,246,0.22)]">
            <p className="text-xs font-semibold tracking-[0.24em] text-white/72 uppercase">
              {copy.statusTitle}
            </p>
            <p className="mt-3 text-sm leading-7 text-white/58">{copy.statusDescription}</p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
                  {copy.stateAgents}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{agentCount ?? 0}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">
                  {copy.stateNotifications}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {notificationCount ?? 0}
                </p>
              </div>
            </div>
          </section>

          {accessState.isAdmin ? (
            <section className="rounded-[2.25rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.14),rgba(139,92,246,0.06))] p-6 shadow-[0_24px_90px_-56px_rgba(139,92,246,0.35)]">
              <p className="text-xs font-semibold tracking-[0.24em] text-white/76 uppercase">
                Internal access
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {copy.adminPanelTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/68">
                {copy.adminPanelDescription}
              </p>
              <Link
                href={copy.adminCard.href}
                locale={normalizedLocale}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white px-4 py-2 text-sm font-medium text-[#18181B] transition-colors hover:bg-white/95"
              >
                <copy.adminCard.icon className="h-4 w-4" />
                {copy.adminCard.title}
              </Link>
            </section>
          ) : null}
        </aside>
      </section>
    </ProductEntryCanvas>
  );
}
