export const API_ERROR_CODES = [
  "validation_error",
  "insufficient_balance",
  "insufficient_balance_for_tip",
  "wallet_cooldown_active",
  "min_withdrawal_not_met",
  "agent_offline",
  "agent_busy",
  "invalid_task_state",
  "seed_already_used",
  "seed_exhausted",
  "tx_failed",
  "invalid_cancel_reason",
  "max_reports_exceeded",
  "account_frozen",
  "broadcast_expired",
  "unauthorized",
  "token_expired",
  "mfa_required",
  "self_hire_forbidden",
  "admin_required",
  "ip_not_allowed",
  "cron_secret_invalid",
  "not_task_owner",
  "not_agent_owner",
  "not_found",
  "agent_not_found",
  "task_not_found",
  "broadcast_not_found",
  "slot_unavailable",
  "tx_already_processed",
  "already_rated",
  "already_following",
  "broadcast_already_selected",
  "conversation_expired",
  "rate_limit_exceeded",
  "captcha_required",
  "platform_at_capacity",
  "withdrawal_suspended",
  "tx_already_processed",
] as const;

export type ErrorCode = (typeof API_ERROR_CODES)[number];

export type ErrorLocale = "en" | "zh";

export type ErrorDetails = Record<string, unknown>;

export type ApiErrorPayload = {
  error: ErrorCode;
  message: string;
  details?: ErrorDetails;
};

export const ERROR_MESSAGES: Record<ErrorCode, { en: string; zh: string }> = {
  validation_error: {
    en: "Invalid input. Please check and try again.",
    zh: "输入有误，请检查后重试。",
  },
  insufficient_balance: {
    en: "Insufficient balance. Please top up first.",
    zh: "余额不足，请先充值。",
  },
  insufficient_balance_for_tip: {
    en: "Insufficient balance for tipping.",
    zh: "余额不足，无法打赏。",
  },
  wallet_cooldown_active: {
    en: "Withdrawal address changed recently. Please wait 48 hours.",
    zh: "提现地址刚变更，请等待 48 小时冷却期。",
  },
  min_withdrawal_not_met: {
    en: "Minimum withdrawal amount is $5.00.",
    zh: "最低提现金额为 $5.00。",
  },
  agent_offline: {
    en: "This Agent is currently offline.",
    zh: "该 Agent 当前不在线。",
  },
  agent_busy: {
    en: "This Agent is currently busy. Please try again later.",
    zh: "该 Agent 当前繁忙，请稍后再试。",
  },
  invalid_task_state: {
    en: "This action is not available for the current task status.",
    zh: "当前任务状态不支持此操作。",
  },
  seed_already_used: {
    en: "You have already used a free trial with this Agent.",
    zh: "您已使用过该 Agent 的免费体验。",
  },
  seed_exhausted: {
    en: "This Agent has no free trial slots available.",
    zh: "该 Agent 的免费体验名额已用完。",
  },
  tx_failed: {
    en: "Transaction failed on-chain. Please try again.",
    zh: "链上交易失败，请重试。",
  },
  invalid_cancel_reason: {
    en: "Please select a reason for cancellation.",
    zh: "请选择取消原因。",
  },
  max_reports_exceeded: {
    en: "You have reached the daily report limit.",
    zh: "今日举报次数已达上限。",
  },
  account_frozen: {
    en: "Your account has been frozen. Please contact support.",
    zh: "您的账户已被冻结，请联系客服。",
  },
  broadcast_expired: {
    en: "This broadcast has expired.",
    zh: "该广播已过期。",
  },
  unauthorized: {
    en: "Please sign in to continue.",
    zh: "请先登录。",
  },
  token_expired: {
    en: "Session expired. Please sign in again.",
    zh: "登录已过期，请重新登录。",
  },
  mfa_required: {
    en: "2FA verification required.",
    zh: "需要二次验证。",
  },
  self_hire_forbidden: {
    en: "You cannot use your own Agent.",
    zh: "不能使用自己的 Agent。",
  },
  admin_required: {
    en: "Admin access required.",
    zh: "需要管理员权限。",
  },
  ip_not_allowed: {
    en: "Access denied from this IP address.",
    zh: "该 IP 地址无权访问。",
  },
  cron_secret_invalid: {
    en: "Invalid cron secret.",
    zh: "Cron 密钥无效。",
  },
  not_task_owner: {
    en: "You do not have permission to manage this task.",
    zh: "您无权操作此任务。",
  },
  not_agent_owner: {
    en: "You do not have permission to manage this Agent.",
    zh: "您无权操作此 Agent。",
  },
  not_found: {
    en: "Resource not found.",
    zh: "资源不存在。",
  },
  agent_not_found: {
    en: "Agent not found.",
    zh: "Agent 不存在。",
  },
  task_not_found: {
    en: "Task not found.",
    zh: "任务不存在。",
  },
  broadcast_not_found: {
    en: "Broadcast not found.",
    zh: "广播不存在。",
  },
  slot_unavailable: {
    en: "This Agent is currently at capacity. Please try again later.",
    zh: "该 Agent 已满负荷，请稍后再试。",
  },
  tx_already_processed: {
    en: "This transaction has already been processed.",
    zh: "该交易已被处理。",
  },
  already_rated: {
    en: "You have already rated this task.",
    zh: "您已评价过此任务。",
  },
  already_following: {
    en: "You are already following.",
    zh: "您已关注。",
  },
  broadcast_already_selected: {
    en: "An Agent has already been selected for this broadcast.",
    zh: "该广播已选择了 Agent。",
  },
  conversation_expired: {
    en: "Conversation has expired and been deleted.",
    zh: "对话已过期并被删除。",
  },
  rate_limit_exceeded: {
    en: "Too many requests. Please slow down.",
    zh: "请求过于频繁，请稍后再试。",
  },
  captcha_required: {
    en: "Please complete the verification.",
    zh: "请完成人机验证。",
  },
  platform_at_capacity: {
    en: "Platform is at capacity. Please try again later.",
    zh: "平台已达并发上限，请稍后再试。",
  },
  withdrawal_suspended: {
    en: "Withdrawals are temporarily suspended.",
    zh: "提现功能暂时维护中。",
  },
};

export const WS_CLOSE_CODES = {
  AUTH_FAILED: 4001,
  INTEGRITY_CHECK_FAILED: 4002,
  SDK_VERSION_TOO_LOW: 4003,
  AGENT_UNAVAILABLE: 4004,
  CONNECTION_LIMIT_EXCEEDED: 4005,
  HEARTBEAT_TIMEOUT: 4006,
  SERVER_MAINTENANCE: 4007,
  SERVER_RESTART: 4008,
  MESSAGE_RATE_LIMITED: 4009,
} as const;

export function isErrorCode(value: string): value is ErrorCode {
  return API_ERROR_CODES.includes(value as ErrorCode);
}

export function createApiError(
  error: ErrorCode,
  message: string,
  details: ErrorDetails = {},
): ApiErrorPayload {
  return Object.keys(details).length > 0 ? { error, message, details } : { error, message };
}

export function getErrorMessage(errorCode: string, locale: ErrorLocale = "en"): string {
  return (
    (isErrorCode(errorCode) ? ERROR_MESSAGES[errorCode]?.[locale] : undefined) ??
    (locale === "zh" ? "发生未知错误，请重试。" : "An unknown error occurred. Please try again.")
  );
}
