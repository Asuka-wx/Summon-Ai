export const NOTIFICATION_PRIORITIES = {
  P0: "P0",
  P1: "P1",
  P2: "P2",
} as const;

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITIES)[keyof typeof NOTIFICATION_PRIORITIES];

export const NOTIFICATION_TYPES = {
  AGENT_SELECTED: "agent_selected",
  TASK_COMPLETED: "task_completed",
  NEW_RATING: "new_rating",
  RATING_MILESTONE: "rating_milestone",
  RANKING_CHANGE: "ranking_change",
  FOLLOWED_AGENT_UPDATE: "followed_agent_update",
  QUALITY_WARNING: "quality_warning",
  QUALITY_RESTORED: "quality_restored",
  SEED_GRADUATION: "seed_graduation",
  WITHDRAWAL_STATUS: "withdrawal_status",
  WALLET_CHANGE: "wallet_change",
  DELETION_WARNING: "deletion_warning",
  BADGE_UNLOCKED: "badge_unlocked",
  CONCURRENCY_UPGRADED: "concurrency_upgraded",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationLocale = "en" | "zh";

export type NotificationChannel = "in_app" | "email";

export type NotificationDefinition = {
  priority: NotificationPriority;
  emailEnabled: boolean;
};

export const NOTIFICATION_DEFINITIONS: Record<NotificationType, NotificationDefinition> = {
  agent_selected: { priority: "P1", emailEnabled: true },
  task_completed: { priority: "P2", emailEnabled: false },
  new_rating: { priority: "P2", emailEnabled: false },
  rating_milestone: { priority: "P2", emailEnabled: false },
  ranking_change: { priority: "P2", emailEnabled: false },
  followed_agent_update: { priority: "P2", emailEnabled: false },
  quality_warning: { priority: "P1", emailEnabled: true },
  quality_restored: { priority: "P1", emailEnabled: true },
  seed_graduation: { priority: "P2", emailEnabled: false },
  withdrawal_status: { priority: "P0", emailEnabled: true },
  wallet_change: { priority: "P0", emailEnabled: true },
  deletion_warning: { priority: "P0", emailEnabled: true },
  badge_unlocked: { priority: "P2", emailEnabled: false },
  concurrency_upgraded: { priority: "P2", emailEnabled: false },
};
