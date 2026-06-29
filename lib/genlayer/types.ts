export type SealStatus =
  | "funded"
  | "accepted"
  | "delivery_submitted"
  | "under_review"
  | "revision_requested"
  | "accepted_full"
  | "accepted_partial"
  | "rejected"
  | "refunded"
  | "settled"
  | "cancelled"
  | "expired";

export type VerdictStatus =
  | "meets_criteria"
  | "partially_meets_criteria"
  | "revision_needed"
  | "does_not_meet_criteria"
  | "unverifiable"
  | "evidence_insufficient"
  | "late_delivery_valid"
  | "late_delivery_invalid"
  | "fraudulent_submission";

export type PaymentAction =
  | "release_full"
  | "release_partial"
  | "request_revision"
  | "refund_buyer"
  | "split_payment"
  | "hold_pending_evidence"
  | "slash_contributor_bond";

export type BondAction = "none" | "return" | "slash_partial" | "slash_full";

export interface WorkSeal {
  seal_id: string;
  buyer: string;
  contributor: string;
  title: string;
  category: string;
  deliverable_description: string;
  acceptance_criteria: string;
  required_evidence: string;
  total_escrow: string;
  remaining_escrow: string;
  bond_required: boolean;
  bond_amount: string;
  bond_locked: string;
  deadline: string;
  revision_limit: string;
  revisions_used: string;
  visibility_mode: "public" | "private";
  status: SealStatus;
  created_at: string;
  accepted_at: string;
  latest_delivery_id: string;
  latest_verdict_id: string;
  delivery_count: string;
  payout_amount: string;
  refund_amount: string;
  bond_action: BondAction;
  payout_claimed: boolean;
  refund_claimed: boolean;
  bond_claimed: boolean;
}

export interface DeliveryPacket {
  delivery_id: string;
  seal_id: string;
  contributor: string;
  delivery_summary: string;
  evidence_urls: string[];
  private_evidence_commitment_hash: string;
  self_assessed_completion_bps: string;
  contributor_notes: string;
  submitted_at: string;
  status: string;
  revision_number: string;
}

export interface SealVerdict {
  verdict_id: string;
  seal_id: string;
  delivery_id: string;
  verdict_status: VerdictStatus;
  payment_action: PaymentAction;
  payout_bps: string;
  revision_required: boolean;
  bond_action: BondAction;
  confidence: string;
  short_reason: string;
  created_at: string;
}

export interface SealSummary {
  seal_id: string;
  title: string;
  category: string;
  buyer: string;
  contributor: string;
  total_escrow: string;
  status: SealStatus;
  deadline: string;
  created_at: string;
  latest_verdict_id: string;
}

export interface AdminStats {
  total_seals: number;
  funded: number;
  accepted: number;
  under_review: number;
  revision_requested: number;
  accepted_full: number;
  accepted_partial: number;
  rejected: number;
  cancelled: number;
  expired: number;
  total_escrowed_wei: string;
  total_released_wei: string;
  total_refunded_wei: string;
  pending_verdicts: number;
  stuck_claims: number;
  contract_version: string;
}

export interface ActivityEvent {
  event: string;
  seal_id: string;
  amount?: string;
  ts: string;
  [key: string]: string | undefined;
}

export interface TxState {
  status: "idle" | "pending" | "confirming" | "finalized" | "error";
  hash?: string;
  error?: string;
}
