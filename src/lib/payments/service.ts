import { decodeEventLog, encodeFunctionData, getAddress, Hex } from "viem";

import { sendNotification } from "@/lib/notifications/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHAIN_CONFIG, formatUSDC, parseUSDC, USDC_ABI } from "@/lib/wallet/config";
import { createBasePublicClient } from "@/lib/payments/client";

import type { DepositStatusResponse } from "./types";

function getDepositAddress() {
  const depositAddress = process.env.NEXT_PUBLIC_PLATFORM_DEPOSIT_ADDRESS;

  if (!depositAddress) {
    throw new Error("Missing NEXT_PUBLIC_PLATFORM_DEPOSIT_ADDRESS.");
  }

  return getAddress(depositAddress);
}

async function getCurrentBalance(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_balances")
    .select("balance")
    .eq("user_id", userId)
    .eq("chain", "base")
    .single();

  return Number(data?.balance ?? 0);
}

export async function getUserBalanceSummary(userId: string) {
  const supabase = createAdminClient();
  const { data: balanceRow } = await supabase
    .from("user_balances")
    .select("balance")
    .eq("user_id", userId)
    .eq("chain", "base")
    .single();

  const { data: withdrawals } = await supabase
    .from("withdrawals")
    .select("amount, fee")
    .eq("user_id", userId)
    .in("status", ["processing", "stuck"]);

  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("to_user_id", userId)
    .in("type", ["task_payment", "tip"]);

  return {
    balance: Number(balanceRow?.balance ?? 0),
    withdrawable_balance: Number(balanceRow?.balance ?? 0),
    pending_withdrawal_amount:
      (withdrawals ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0) + Number(item.fee ?? 0), 0),
    lifetime_earnings: (payments ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  };
}

export async function validateAndConfirmDeposit({
  txHash,
  fromAddress,
  userId,
}: {
  txHash: string;
  fromAddress: string;
  userId: string;
}): Promise<DepositStatusResponse> {
  const supabase = createAdminClient();
  const publicClient = createBasePublicClient();

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("tx_hash", txHash)
    .maybeSingle();

  if (existingPayment) {
    throw new Error("tx_already_processed");
  }

  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as Hex,
  }).catch(() => null);

  if (!receipt) {
    return {
      status: "pending",
    };
  }

  if (receipt.status !== "success") {
    throw new Error("tx_failed");
  }

  const currentBlockNumber = await publicClient.getBlockNumber();
  const confirmations = Number(currentBlockNumber - receipt.blockNumber);

  if (confirmations < CHAIN_CONFIG.DEPOSIT_CONFIRMATIONS) {
    return {
      status: "confirming",
      confirmations,
    };
  }

  const transferLog = receipt.logs.find(
    (log) =>
      getAddress(log.address) === getAddress(CHAIN_CONFIG.USDC_ADDRESS) &&
      log.topics[0] === CHAIN_CONFIG.TRANSFER_EVENT_TOPIC,
  );

  if (!transferLog) {
    throw new Error("tx_failed");
  }

  const decoded = decodeEventLog({
    abi: USDC_ABI,
    data: transferLog.data,
    topics: transferLog.topics,
  });

  if (decoded.eventName !== "Transfer") {
    throw new Error("tx_failed");
  }

  const transferArgs = decoded.args as unknown as {
    from: `0x${string}`;
    to: `0x${string}`;
    value: bigint;
  };

  const decodedFrom = getAddress(String(transferArgs.from));
  const decodedTo = getAddress(String(transferArgs.to));
  const submittedFrom = getAddress(fromAddress);

  if (decodedFrom !== submittedFrom || decodedTo !== getDepositAddress()) {
    throw new Error("tx_failed");
  }

  const amount = formatUSDC(transferArgs.value);

  if (amount <= 0) {
    throw new Error("tx_failed");
  }

  const balanceBefore = await getCurrentBalance(userId);
  const balanceAfter = balanceBefore + amount;

  await supabase.from("payments").insert({
    from_user_id: userId,
    to_user_id: userId,
    type: "deposit",
    amount,
    tx_hash: txHash,
    status: "completed",
  });

  await supabase.from("user_balances").upsert(
    {
      user_id: userId,
      chain: "base",
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,chain",
    },
  );

  await supabase.from("audit_logs").insert({
    event_type: "deposit_confirmed",
    user_id: userId,
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    tx_hash: txHash,
    metadata: {
      from_address: submittedFrom,
      confirmations,
    },
  });

  return {
    status: "confirmed",
    amount,
    balance_after: balanceAfter,
  };
}

export async function getDepositStatus(txHash: string): Promise<DepositStatusResponse> {
  const supabase = createAdminClient();
  const publicClient = createBasePublicClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("tx_hash", txHash)
    .maybeSingle();

  if (payment?.status === "completed") {
    return {
      status: "confirmed",
      amount: Number(payment.amount ?? 0),
    };
  }

  const receipt = await publicClient.getTransactionReceipt({
    hash: txHash as Hex,
  }).catch(() => null);

  if (!receipt) {
    return { status: "pending" };
  }

  if (receipt.status !== "success") {
    return { status: "failed" };
  }

  const currentBlockNumber = await publicClient.getBlockNumber();
  const confirmations = Number(currentBlockNumber - receipt.blockNumber);

  if (confirmations < CHAIN_CONFIG.DEPOSIT_CONFIRMATIONS) {
    return {
      status: "confirming",
      confirmations,
    };
  }

  return {
    status: "confirmed",
    confirmations,
    amount: Number(payment?.amount ?? 0),
  };
}

export async function sendTip({
  taskId,
  userId,
  amount,
}: {
  taskId: string;
  userId: string;
  amount: number;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("process_tip", {
    p_task_id: taskId,
    p_user_id: userId,
    p_tip_amount: amount,
  });

  if (error) {
    throw new Error("validation_error");
  }

  if (data?.status === "error") {
    if (data.code === "INVALID_TIP_AMOUNT") {
      throw new Error("validation_error");
    }

    if (data.code === "INSUFFICIENT_BALANCE") {
      throw new Error("insufficient_balance_for_tip");
    }
  }

  if (data?.status === "already_tipped") {
    throw new Error("already_rated");
  }

  return data;
}

export async function requestWithdrawal({
  userId,
  amount,
}: {
  userId: string;
  amount: number;
}) {
  const supabase = createAdminClient();
  const minWithdrawalAmount = Number(process.env.MIN_WITHDRAWAL_AMOUNT ?? 5);
  const withdrawalFee = Number(process.env.WITHDRAWAL_FEE ?? 0.1);
  const walletCooldownHours = Number(process.env.WALLET_CHANGE_COOLDOWN_HOURS ?? 48);

  if ((process.env.FF_WITHDRAWAL_ENABLED ?? "true") !== "true") {
    throw new Error("withdrawal_suspended");
  }

  if (amount < minWithdrawalAmount) {
    throw new Error("min_withdrawal_not_met");
  }

  const { data: user } = await supabase
    .from("users")
    .select("payout_wallet, wallet_change_requested_at")
    .eq("id", userId)
    .single();

  if (!user?.payout_wallet) {
    throw new Error("validation_error");
  }

  if (
    user.wallet_change_requested_at &&
    Date.now() - new Date(user.wallet_change_requested_at).getTime() <
      walletCooldownHours * 60 * 60 * 1000
  ) {
    throw new Error("wallet_cooldown_active");
  }

  const balanceBefore = await getCurrentBalance(userId);
  const totalDebit = amount + withdrawalFee;

  if (balanceBefore < totalDebit) {
    throw new Error("insufficient_balance");
  }

  const balanceAfter = balanceBefore - totalDebit;
  const netAmount = amount - withdrawalFee;

  const { data: withdrawal, error } = await supabase
    .from("withdrawals")
    .insert({
      user_id: userId,
      amount,
      fee: withdrawalFee,
      net_amount: netAmount,
      wallet_address: user.payout_wallet,
      status: "processing",
    })
    .select("id, amount, fee, net_amount, wallet_address, status")
    .single();

  if (error || !withdrawal) {
    throw new Error("validation_error");
  }

  await supabase.from("user_balances").upsert(
    {
      user_id: userId,
      chain: "base",
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,chain",
    },
  );

  await supabase.from("payments").insert({
    from_user_id: userId,
    to_user_id: userId,
    type: "withdrawal",
    amount,
    platform_fee: withdrawalFee,
    status: "pending",
  });

  await supabase.from("audit_logs").insert({
    event_type: "withdrawal_requested",
    user_id: userId,
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    metadata: {
      withdrawal_id: withdrawal.id,
      fee: withdrawalFee,
      wallet_address: withdrawal.wallet_address,
    },
  });

  return {
    withdrawal_id: withdrawal.id,
    status: withdrawal.status,
    amount: withdrawal.amount,
    fee: withdrawal.fee,
    net_amount: withdrawal.net_amount,
    balance_after: balanceAfter,
  };
}

export async function notifyWithdrawalStatus({
  userId,
  withdrawalId,
  status,
}: {
  userId: string;
  withdrawalId: string;
  status: "completed" | "failed" | "stuck";
}) {
  return sendNotification(userId, "withdrawal_status", {
    withdrawal_id: withdrawalId,
    status,
  });
}

export async function getGasStatus() {
  const publicClient = createBasePublicClient();
  const platformGasAddress = process.env.NEXT_PUBLIC_PLATFORM_DEPOSIT_ADDRESS;

  if (!platformGasAddress) {
    return {
      level: "unknown",
      eth_balance: 0,
      message: "Missing NEXT_PUBLIC_PLATFORM_DEPOSIT_ADDRESS.",
    };
  }

  const rawBalance = await publicClient.getBalance({
    address: getAddress(platformGasAddress),
  });

  const ethBalance = Number(rawBalance) / 1e18;
  const warnThreshold = Number(process.env.GAS_WARN_THRESHOLD_ETH ?? 0.002);
  const criticalThreshold = Number(process.env.GAS_CRITICAL_THRESHOLD_ETH ?? 0.0005);

  if (ethBalance < criticalThreshold) {
    return {
      level: "critical",
      eth_balance: ethBalance,
    };
  }

  if (ethBalance < warnThreshold) {
    return {
      level: "warning",
      eth_balance: ethBalance,
    };
  }

  return {
    level: "normal",
    eth_balance: ethBalance,
  };
}

export async function createBalanceAuditSnapshot() {
  const supabase = createAdminClient();
  const { data: balances } = await supabase.from("user_balances").select("balance");
  const { data: pendingWithdrawals } = await supabase
    .from("withdrawals")
    .select("amount, fee")
    .in("status", ["processing", "stuck"]);

  const totalUserBalances = (balances ?? []).reduce(
    (sum, row) => sum + Number(row.balance ?? 0),
    0,
  );
  const totalPendingWithdrawals = (pendingWithdrawals ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0) + Number(row.fee ?? 0),
    0,
  );
  const difference = Math.abs(totalUserBalances - totalPendingWithdrawals);

  await supabase.from("audit_logs").insert({
    event_type: "balance_audit",
    amount: totalUserBalances,
    metadata: {
      total_user_balances: totalUserBalances,
      total_pending_withdrawals: totalPendingWithdrawals,
      difference,
    },
  });

  if (difference > 1) {
    await supabase.from("admin_alerts").insert({
      alert_type: "balance_audit_mismatch",
      severity: "high",
      title: "Balance audit mismatch detected",
      description: "Platform balance audit difference exceeded $1.",
      payload: {
        total_user_balances: totalUserBalances,
        total_pending_withdrawals: totalPendingWithdrawals,
        difference,
      },
    });
  }

  return {
    total_user_balances: totalUserBalances,
    total_pending_withdrawals: totalPendingWithdrawals,
    difference,
  };
}

export function encodeUsdcTransferData({
  to,
  amount,
}: {
  to: `0x${string}`;
  amount: number;
}) {
  return encodeFunctionData({
    abi: USDC_ABI,
    functionName: "transfer",
    args: [to, parseUSDC(amount)],
  });
}
