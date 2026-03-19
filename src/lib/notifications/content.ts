import type { NotificationLocale, NotificationType } from "@/lib/notifications/types";

type NotificationContent = {
  title: string;
  body: string;
  href: string;
};

function localizedHref(locale: NotificationLocale, path: string) {
  return `/${locale}${path}`;
}

export function getNotificationContent({
  type,
  locale,
  metadata,
}: {
  type: NotificationType;
  locale: NotificationLocale;
  metadata: Record<string, unknown>;
}): NotificationContent {
  const taskId = String(metadata.task_id ?? metadata.taskId ?? "");
  const agentId = String(metadata.agent_id ?? metadata.agentId ?? "");
  const badgeId = String(metadata.badge_id ?? metadata.badgeId ?? "");

  const map: Record<NotificationType, { en: NotificationContent; zh: NotificationContent }> = {
    agent_selected: {
      en: {
        title: "A user selected your Agent",
        body: "A new task is ready for your Agent.",
        href: localizedHref(locale, `/tasks/${taskId}`),
      },
      zh: {
        title: "有用户选择了你的 Agent",
        body: "一个新的任务已经分配给你的 Agent。",
        href: localizedHref(locale, `/tasks/${taskId}`),
      },
    },
    task_completed: {
      en: {
        title: "Task completed",
        body: "A task has finished. You can now review the summary.",
        href: localizedHref(locale, `/tasks/${taskId}`),
      },
      zh: {
        title: "任务已完成",
        body: "一个任务已结束，你现在可以查看任务摘要。",
        href: localizedHref(locale, `/tasks/${taskId}`),
      },
    },
    new_rating: {
      en: {
        title: "New rating received",
        body: "One of your recent tasks received a new rating.",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
      zh: {
        title: "收到新的评分",
        body: "你最近完成的任务收到了一条新的评分。",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
    },
    rating_milestone: {
      en: {
        title: "Rating milestone unlocked",
        body: "Your Agent reached a new public rating milestone.",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
      zh: {
        title: "评分里程碑已达成",
        body: "你的 Agent 达成了新的公开评分里程碑。",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
    },
    ranking_change: {
      en: {
        title: "Leaderboard position changed",
        body: "Your Agent entered or left the latest leaderboard top positions.",
        href: localizedHref(locale, "/leaderboards"),
      },
      zh: {
        title: "排行榜名次发生变化",
        body: "你的 Agent 进入或跌出了最新排行榜前列。",
        href: localizedHref(locale, "/leaderboards"),
      },
    },
    followed_agent_update: {
      en: {
        title: "Followed Agent updated",
        body: "An Agent you follow updated pricing or profile information.",
        href: localizedHref(locale, `/agents/${agentId}`),
      },
      zh: {
        title: "你关注的 Agent 有更新",
        body: "你关注的 Agent 更新了价格或资料信息。",
        href: localizedHref(locale, `/agents/${agentId}`),
      },
    },
    quality_warning: {
      en: {
        title: "Quality warning issued",
        body: "Your Agent quality status has been downgraded and requires attention.",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
      zh: {
        title: "质量预警已触发",
        body: "你的 Agent 质量状态已降级，需要尽快处理。",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
    },
    quality_restored: {
      en: {
        title: "Quality restored",
        body: "Your Agent quality status has recovered.",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
      zh: {
        title: "质量状态已恢复",
        body: "你的 Agent 质量状态已经恢复。",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
    },
    seed_graduation: {
      en: {
        title: "Seed phase completed",
        body: "Your Agent finished all available seed slots.",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
      zh: {
        title: "种子阶段已完成",
        body: "你的 Agent 已完成全部可用的种子任务名额。",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
    },
    withdrawal_status: {
      en: {
        title: "Withdrawal status updated",
        body: "Your latest withdrawal changed status.",
        href: localizedHref(locale, "/seller/wallet"),
      },
      zh: {
        title: "提现状态已更新",
        body: "你最近的一笔提现状态发生了变化。",
        href: localizedHref(locale, "/seller/wallet"),
      },
    },
    wallet_change: {
      en: {
        title: "Withdrawal wallet changed",
        body: "Your payout wallet was updated and a cooldown is now active.",
        href: localizedHref(locale, "/my/settings"),
      },
      zh: {
        title: "提现钱包已变更",
        body: "你的提现钱包已更新，冷静期已开始计时。",
        href: localizedHref(locale, "/my/settings"),
      },
    },
    deletion_warning: {
      en: {
        title: "Conversation deletion warning",
        body: "A task conversation will be deleted soon unless it is under report review.",
        href: localizedHref(locale, `/tasks/${taskId}`),
      },
      zh: {
        title: "对话即将删除提醒",
        body: "某个任务对话将在不久后删除，除非它仍处于举报审核中。",
        href: localizedHref(locale, `/tasks/${taskId}`),
      },
    },
    badge_unlocked: {
      en: {
        title: "Badge unlocked",
        body: "A new badge has been added to your profile.",
        href: localizedHref(locale, `/badges/${badgeId || ""}`),
      },
      zh: {
        title: "解锁了新的徽章",
        body: "你的个人资料新增了一枚徽章。",
        href: localizedHref(locale, `/badges/${badgeId || ""}`),
      },
    },
    concurrency_upgraded: {
      en: {
        title: "Concurrency upgraded",
        body: "Your Agent concurrency level increased.",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
      zh: {
        title: "并发等级已提升",
        body: "你的 Agent 并发等级已提升。",
        href: localizedHref(locale, `/seller/agents/${agentId}`),
      },
    },
  };

  return map[type][locale];
}
