import { createErrorResponse } from "@/lib/api-error";

export function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return createErrorResponse(500, "validation_error", "Unknown server error.");
  }

  switch (error.message) {
    case "unauthorized":
      return createErrorResponse(401, "unauthorized", "Missing or invalid Bearer token.");
    case "validation_error":
      return createErrorResponse(400, "validation_error", "Request body validation failed.");
    case "account_frozen":
      return createErrorResponse(400, "account_frozen", "Your account has been frozen.");
    case "broadcast_not_found":
      return createErrorResponse(404, "broadcast_not_found", "Broadcast not found.");
    case "broadcast_expired":
      return createErrorResponse(400, "broadcast_expired", "This broadcast has expired.");
    case "broadcast_already_selected":
      return createErrorResponse(409, "broadcast_already_selected", "An Agent has already been selected for this broadcast.");
    case "already_following":
      return createErrorResponse(409, "already_following", "You are already following this target.");
    case "agent_not_found":
      return createErrorResponse(404, "agent_not_found", "Agent not found.");
    case "agent_offline":
      return createErrorResponse(400, "agent_offline", "This Agent is currently offline.");
    case "agent_busy":
      return createErrorResponse(400, "agent_busy", "This Agent is currently busy.");
    case "agent_unavailable":
      return createErrorResponse(400, "agent_unavailable", "This Agent is currently unavailable.");
    case "slot_unavailable":
      return createErrorResponse(409, "slot_unavailable", "This Agent is currently at capacity.");
    case "tx_failed":
      return createErrorResponse(400, "tx_failed", "Transaction failed on-chain.");
    case "tx_already_processed":
      return createErrorResponse(409, "tx_already_processed", "This transaction has already been processed.");
    case "task_not_found":
      return createErrorResponse(404, "task_not_found", "Task not found.");
    case "not_agent_owner":
      return createErrorResponse(403, "not_agent_owner", "You do not have permission to manage this Agent.");
    case "not_task_owner":
      return createErrorResponse(403, "not_task_owner", "You do not have permission to manage this task.");
    case "self_hire_forbidden":
      return createErrorResponse(403, "self_hire_forbidden", "You cannot use your own Agent.");
    case "invalid_task_state":
      return createErrorResponse(400, "invalid_task_state", "This action is not available for the current task status.");
    case "seed_already_used":
      return createErrorResponse(400, "seed_already_used", "You have already used a free trial with this Agent.");
    case "seed_exhausted":
      return createErrorResponse(400, "seed_exhausted", "This Agent has no free trial slots available.");
    case "invalid_cancel_reason":
      return createErrorResponse(400, "invalid_cancel_reason", "Please select a reason for cancellation.");
    case "already_rated":
      return createErrorResponse(409, "already_rated", "You have already rated this task.");
    case "max_reports_exceeded":
      return createErrorResponse(429, "max_reports_exceeded", "You have reached the daily report limit.");
    case "insufficient_balance":
      return createErrorResponse(400, "insufficient_balance", "Insufficient balance. Please top up first.");
    case "insufficient_balance_for_tip":
      return createErrorResponse(400, "insufficient_balance_for_tip", "Insufficient balance for tipping.");
    case "wallet_cooldown_active":
      return createErrorResponse(400, "wallet_cooldown_active", "Withdrawal address changed recently. Please wait 48 hours.");
    case "min_withdrawal_not_met":
      return createErrorResponse(400, "min_withdrawal_not_met", "Minimum withdrawal amount is $5.00.");
    case "withdrawal_suspended":
      return createErrorResponse(503, "withdrawal_suspended", "Withdrawals are temporarily suspended.");
    case "not_activated":
      return createErrorResponse(403, "not_activated", "Please activate your account with an invitation code.");
    case "cron_secret_invalid":
      return createErrorResponse(403, "cron_secret_invalid", "Invalid cron secret.");
    case "conversation_expired":
      return createErrorResponse(410, "conversation_expired", "Conversation has expired and been deleted.");
    case "not_found":
      return createErrorResponse(404, "not_found", "Resource not found.");
    case "rate_limit_exceeded":
      return createErrorResponse(429, "rate_limit_exceeded", "Too many requests. Please slow down.");
    case "captcha_required":
      return createErrorResponse(
        429,
        "captcha_required",
        "Captcha verification is required before continuing.",
        {
          captcha_sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? "",
        },
      );
    case "platform_at_capacity":
      return createErrorResponse(503, "platform_at_capacity", "Platform is at capacity. Please try again later.");
    default:
      return createErrorResponse(500, "validation_error", error.message);
  }
}
