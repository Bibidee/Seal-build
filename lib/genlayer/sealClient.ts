"use client";

import { getClient, getClientReady } from "@/lib/genlayer/client";
import type {
  WorkSeal, DeliveryPacket, SealVerdict, SealSummary, AdminStats, ActivityEvent,
} from "@/lib/genlayer/types";

function contractAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  return addr as `0x${string}`;
}

function parseJson<T>(raw: unknown): T | null {
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  return raw as T ?? null;
}

// ---- Read methods ----

export async function getSeal(seal_id: string): Promise<WorkSeal | null> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_seal",
    args: [seal_id],
  });
  const s = parseJson<WorkSeal>(result as string);
  if (!s || "error" in (s as object)) return null;
  return s;
}

export async function getSealPublic(seal_id: string): Promise<WorkSeal | null> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_seal_detail_public",
    args: [seal_id],
  });
  const s = parseJson<WorkSeal>(result as string);
  if (!s || "error" in (s as object)) return null;
  return s;
}

export async function getPublicSeals(offset = 0, limit = 20): Promise<{ seals: SealSummary[]; total: number }> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_public_seals",
    args: [BigInt(offset), BigInt(limit)],
  });
  return parseJson<{ seals: SealSummary[]; total: number }>(result as string) ?? { seals: [], total: 0 };
}

export async function getSealsByBuyer(buyer: string): Promise<WorkSeal[]> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_seals_by_buyer",
    args: [buyer],
  });
  return parseJson<WorkSeal[]>(result as string) ?? [];
}

export async function getSealsByContributor(contributor: string): Promise<WorkSeal[]> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_seals_by_contributor",
    args: [contributor],
  });
  return parseJson<WorkSeal[]>(result as string) ?? [];
}

export async function getDeliveryPackets(seal_id: string): Promise<DeliveryPacket[]> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_delivery_packets",
    args: [seal_id],
  });
  return parseJson<DeliveryPacket[]>(result as string) ?? [];
}

export async function getVerdict(verdict_id: string): Promise<SealVerdict | null> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_verdict",
    args: [verdict_id],
  });
  const v = parseJson<SealVerdict>(result as string);
  if (!v || "error" in (v as object)) return null;
  return v;
}

export async function getWalletActivity(address: string): Promise<ActivityEvent[]> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_wallet_activity",
    args: [address],
  });
  return parseJson<ActivityEvent[]>(result as string) ?? [];
}

export async function getAdminStats(): Promise<AdminStats | null> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_admin_monitor_stats",
    args: [],
  });
  return parseJson<AdminStats>(result as string);
}

export async function getSealCount(): Promise<number> {
  const client = getClient();
  const result = await client.readContract({
    address: contractAddress(),
    functionName: "get_seal_count",
    args: [],
  });
  return parseInt(result as string, 10) || 0;
}

// ---- Write methods ----

export async function createSeal(params: {
  title: string;
  category: string;
  deliverable_description: string;
  acceptance_criteria: string;
  required_evidence: string;
  deadline: bigint;
  revision_limit: bigint;
  visibility_mode: string;
  contributor_address: string;
  bond_required: boolean;
  bond_amount: bigint;
  value: bigint;
}): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "create_seal",
    args: [
      params.title,
      params.category,
      params.deliverable_description,
      params.acceptance_criteria,
      params.required_evidence,
      params.deadline,
      params.revision_limit,
      params.visibility_mode,
      params.contributor_address,
      params.bond_required,
      params.bond_amount,
    ],
    value: params.value,
  });
  return hash as string;
}

export async function acceptSeal(seal_id: string, value: bigint): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "accept_seal",
    args: [seal_id],
    value,
  });
  return hash as string;
}

export async function cancelUnacceptedSeal(seal_id: string): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "cancel_unaccepted_seal",
    args: [seal_id],
    value: 0n,
  });
  return hash as string;
}

export async function expireSeal(seal_id: string): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "expire_seal",
    args: [seal_id],
    value: 0n,
  });
  return hash as string;
}

export async function submitDelivery(params: {
  seal_id: string;
  delivery_summary: string;
  evidence_urls: string[];
  private_evidence_commitment_hash: string;
  self_assessed_completion_bps: bigint;
  contributor_notes: string;
}): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "submit_delivery",
    args: [
      params.seal_id,
      params.delivery_summary,
      JSON.stringify(params.evidence_urls),
      params.private_evidence_commitment_hash,
      params.self_assessed_completion_bps,
      params.contributor_notes,
    ],
    value: 0n,
  });
  return hash as string;
}

export async function submitRevision(params: {
  seal_id: string;
  delivery_summary: string;
  evidence_urls: string[];
  private_evidence_commitment_hash: string;
  self_assessed_completion_bps: bigint;
  contributor_notes: string;
}): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "submit_revision",
    args: [
      params.seal_id,
      params.delivery_summary,
      JSON.stringify(params.evidence_urls),
      params.private_evidence_commitment_hash,
      params.self_assessed_completion_bps,
      params.contributor_notes,
    ],
    value: 0n,
  });
  return hash as string;
}

export async function requestAcceptanceVerdict(seal_id: string, buyer_notes: string): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "request_acceptance_verdict",
    args: [seal_id, buyer_notes],
    value: 0n,
  });
  return hash as string;
}

export async function claimContributorPayout(seal_id: string): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "claim_contributor_payout",
    args: [seal_id],
    value: 0n,
  });
  return hash as string;
}

export async function claimBuyerRefund(seal_id: string): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "claim_buyer_refund",
    args: [seal_id],
    value: 0n,
  });
  return hash as string;
}

export async function withdrawContributorBond(seal_id: string): Promise<string> {
  const client = await getClientReady();
  const hash = await client.writeContract({
    address: contractAddress(),
    functionName: "withdraw_contributor_bond",
    args: [seal_id],
    value: 0n,
  });
  return hash as string;
}

// ---- Helpers ----

export function genToWei(gen: string): bigint {
  const parts = gen.split(".");
  const whole = BigInt(parts[0] || "0");
  let frac = BigInt(0);
  if (parts[1]) {
    const padded = parts[1].padEnd(18, "0").slice(0, 18);
    frac = BigInt(padded);
  }
  return whole * BigInt("1000000000000000000") + frac;
}

export function weiToGen(wei: string | bigint): string {
  const w = BigInt(wei);
  const one = BigInt("1000000000000000000");
  const whole = w / one;
  const frac = w % one;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function explorerTx(hash: string): string {
  return `${process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio.genlayer.com"}/tx/${hash}`;
}

export function explorerAddress(addr: string): string {
  return `${process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio.genlayer.com"}/address/${addr}`;
}

export function formatDeadline(ts: string): string {
  const d = new Date(parseInt(ts) * 1000);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function isDeadlinePassed(ts: string): boolean {
  return Date.now() > parseInt(ts) * 1000;
}

export function statusColor(status: string): string {
  switch (status) {
    case "funded": return "text-[#E0B64B] bg-[#1a1400]/60 border-[#E0B64B]/30";
    case "accepted": return "text-[#22D3EE] bg-[#001a1f]/60 border-[#22D3EE]/30";
    case "delivery_submitted": return "text-[#7C3AED] bg-[#0d0020]/60 border-[#7C3AED]/30";
    case "under_review": return "text-[#7C3AED] bg-[#0d0020]/60 border-[#7C3AED]/30";
    case "revision_requested": return "text-[#F59E0B] bg-[#1a1000]/60 border-[#F59E0B]/30";
    case "accepted_full": return "text-[#16A34A] bg-[#001a08]/60 border-[#16A34A]/30";
    case "accepted_partial": return "text-[#22D3EE] bg-[#001a1f]/60 border-[#22D3EE]/30";
    case "rejected": return "text-[#EF4444] bg-[#1a0000]/60 border-[#EF4444]/30";
    case "cancelled": return "text-[#64748B] bg-[#0a0f1a]/60 border-[#64748B]/30";
    case "expired": return "text-[#64748B] bg-[#0a0f1a]/60 border-[#64748B]/30";
    default: return "text-[#CBD5E1] bg-[#0f172a]/60 border-[#CBD5E1]/30";
  }
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    funded: "Funded",
    accepted: "Accepted",
    delivery_submitted: "Delivery Submitted",
    under_review: "Under Review",
    revision_requested: "Revision Requested",
    accepted_full: "Accepted — Full",
    accepted_partial: "Accepted — Partial",
    rejected: "Rejected",
    refunded: "Refunded",
    settled: "Settled",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return labels[status] ?? status;
}
