import { createAdminClient } from "@/lib/supabase/admin";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ];

  return lines.join("\n");
}

export async function exportAdminData(
  type: "users" | "agents" | "tasks" | "transactions" | "audit_logs",
) {
  const supabase = createAdminClient();

  if (type === "users") {
    const { data } = await supabase
      .from("users")
      .select("id, display_name, email, role, is_frozen, locale, created_at, updated_at");
    return toCsv(data ?? []);
  }

  if (type === "agents") {
    const { data } = await supabase
      .from("agents")
      .select("id, owner_id, name, status, quality_status, price_per_call, total_tasks, total_earnings, total_tips, health_score, created_at");
    return toCsv(data ?? []);
  }

  if (type === "tasks") {
    const { data } = await supabase
      .from("tasks")
      .select("id, user_id, agent_id, status, phase, round_count, paid_rounds, total_charge, is_seed_task, is_direct, created_at, completed_at, end_reason");
    return toCsv((data ?? []).map((row) => ({
      ...row,
      total_charge: Number(row.total_charge ?? 0),
      round_count: Number(row.round_count ?? 0),
      paid_rounds: Number(row.paid_rounds ?? 0),
    })));
  }

  if (type === "transactions") {
    const [{ data: payments }, { data: withdrawals }] = await Promise.all([
      supabase
        .from("payments")
        .select("id, task_id, from_user_id, to_user_id, type, amount, platform_fee, tx_hash, status, created_at"),
      supabase
        .from("withdrawals")
        .select("id, user_id, amount, fee, net_amount, wallet_address, tx_hash, status, created_at, processed_at"),
    ]);

    return toCsv([
      ...(payments ?? []).map((payment) => ({
        kind: "payment",
        ...payment,
      })),
      ...(withdrawals ?? []).map((withdrawal) => ({
        kind: "withdrawal",
        ...withdrawal,
      })),
    ]);
  }

  const { data } = await supabase
    .from("audit_logs")
    .select("id, event_type, task_id, user_id, agent_id, round_number, amount, balance_before, balance_after, platform_fee, tx_hash, metadata, created_at");
  return toCsv(data ?? []);
}
