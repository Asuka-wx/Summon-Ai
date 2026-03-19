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
    case "agent_not_found":
      return createErrorResponse(404, "agent_not_found", "Agent not found.");
    case "agent_offline":
      return createErrorResponse(400, "agent_offline", "This Agent is currently offline.");
    case "slot_unavailable":
      return createErrorResponse(409, "slot_unavailable", "This Agent is currently at capacity.");
    case "tx_failed":
      return createErrorResponse(400, "tx_failed", "Transaction failed on-chain.");
    case "tx_already_processed":
      return createErrorResponse(409, "tx_already_processed", "This transaction has already been processed.");
    case "task_not_found":
      return createErrorResponse(404, "task_not_found", "Task not found.");
    case "not_task_owner":
      return createErrorResponse(403, "not_task_owner", "You do not have permission to manage this task.");
    case "self_hire_forbidden":
      return createErrorResponse(403, "self_hire_forbidden", "You cannot use your own Agent.");
    case "invalid_task_state":
      return createErrorResponse(400, "invalid_task_state", "This action is not available for the current task status.");
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
    default:
      return createErrorResponse(500, "validation_error", error.message);
  }
}
