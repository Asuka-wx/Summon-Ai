export interface DepositRequest {
  tx_hash: string;
  from_address: string;
}

export interface DepositStatusResponse {
  status: "pending" | "confirming" | "confirmed" | "failed";
  confirmations?: number;
  amount?: number;
  balance_after?: number;
}
