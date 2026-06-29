"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shield, Lock, Send, RotateCcw, Scale, AlertTriangle, Plus, Minus, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSeal, getDeliveryPackets, getVerdict,
  submitDelivery, submitRevision, requestAcceptanceVerdict,
  weiToGen, shortAddr, statusLabel, statusColor, formatDeadline, isDeadlinePassed,
} from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { EscrowRail } from "@/components/seal/EscrowRail";
import { VerdictChamber } from "@/components/seal/VerdictChamber";
import { CriteriaGrid } from "@/components/seal/CriteriaGrid";
import { TxLink } from "@/components/ui/TxLink";
import type { WorkSeal, DeliveryPacket, SealVerdict } from "@/lib/genlayer/types";

export default function WorkRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();

  const [seal, setSeal] = useState<WorkSeal | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryPacket[]>([]);
  const [verdict, setVerdict] = useState<SealVerdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deliveryForm, setDeliveryForm] = useState({
    summary: "",
    evidence_urls: [""],
    private_hash: "",
    completion_bps: "10000",
    notes: "",
  });

  const [buyerNotes, setBuyerNotes] = useState("");
  const [txState, setTxState] = useState<{ status: string; hash?: string; error?: string }>({ status: "idle" });

  async function load() {
    if (!id) return;
    try {
      const [s, d] = await Promise.all([getSeal(id), getDeliveryPackets(id)]);
      setSeal(s);
      setDeliveries(d);
      if (s?.latest_verdict_id) {
        const v = await getVerdict(s.latest_verdict_id).catch(() => null);
        setVerdict(v);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Lock className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <p className="text-[#475569] text-sm">Connect your wallet to access the Work Room.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-20 text-[#475569] text-sm">Loading work room…</div>;
  if (error) return <div className="text-center py-20 text-[#EF4444] text-sm">{error}</div>;
  if (!seal) return <div className="text-center py-20 text-[#475569] text-sm">Seal not found.</div>;

  const isBuyer = address.toLowerCase() === seal.buyer.toLowerCase();
  const isContributor = address.toLowerCase() === seal.contributor?.toLowerCase();

  if (!isBuyer && !isContributor) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Shield className="w-10 h-10 text-[#EF4444] mx-auto mb-4" />
        <p className="text-[#475569] text-sm">This work room is only accessible to the buyer and contributor.</p>
      </div>
    );
  }

  const canSubmitDelivery = isContributor && ["accepted", "revision_requested"].includes(seal.status);
  const canRequestVerdict = (isBuyer || isContributor) && seal.status === "delivery_submitted";

  async function handleSubmitDelivery(isRevision: boolean) {
    const urls = deliveryForm.evidence_urls.filter(Boolean);
    if (urls.length === 0 || !deliveryForm.summary) return;
    setTxState({ status: "pending" });
    try {
      const params = {
        seal_id: seal!.seal_id,
        delivery_summary: deliveryForm.summary,
        evidence_urls: urls,
        private_evidence_commitment_hash: deliveryForm.private_hash,
        self_assessed_completion_bps: BigInt(parseInt(deliveryForm.completion_bps) || 10000),
        contributor_notes: deliveryForm.notes,
      };
      const hash = isRevision ? await submitRevision(params) : await submitDelivery(params);
      setTxState({ status: "waiting", hash });
      await waitForTxFinality(hash as `0x${string}`);
      setTxState({ status: "done", hash });
      load();
    } catch (e) {
      setTxState({ status: "error", error: e instanceof Error ? e.message : "Failed" });
    }
  }

  async function handleRequestVerdict() {
    setTxState({ status: "pending" });
    try {
      const hash = await requestAcceptanceVerdict(seal!.seal_id, buyerNotes);
      setTxState({ status: "waiting", hash });
      await waitForTxFinality(hash as `0x${string}`);
      setTxState({ status: "done", hash });
      load();
    } catch (e) {
      setTxState({ status: "error", error: e instanceof Error ? e.message : "Failed" });
    }
  }

  const isRevision = seal.status === "revision_requested";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-1 font-mono">Work Room · Seal #{seal.seal_id}</div>
          <h1 className="text-xl font-bold text-[#F8FAFC]">{seal.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#475569]">
            <span>Buyer: <span className="font-mono text-[#22D3EE]">{shortAddr(seal.buyer)}</span></span>
            {seal.contributor && <span>· Contributor: <span className="font-mono text-[#22D3EE]">{shortAddr(seal.contributor)}</span></span>}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border uppercase tracking-wider flex-shrink-0 ${statusColor(seal.status)}`}>
          {statusLabel(seal.status)}
        </span>
      </div>

      {/* Role badge */}
      <div className="mb-5 flex items-center gap-2">
        {isBuyer && <span className="text-[10px] text-[#E0B64B] bg-[#1a1200]/60 border border-[#E0B64B]/30 rounded px-2 py-0.5 font-mono uppercase">Buyer</span>}
        {isContributor && <span className="text-[10px] text-[#22D3EE] bg-[#001a1f]/60 border border-[#22D3EE]/30 rounded px-2 py-0.5 font-mono uppercase">Contributor</span>}
      </div>

      {/* Escrow Rail */}
      <div className="mb-5"><EscrowRail seal={seal} /></div>

      {/* Criteria */}
      <div className="mb-6">
        <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Acceptance Criteria Grid</div>
        <CriteriaGrid
          deliverable_description={seal.deliverable_description}
          acceptance_criteria={seal.acceptance_criteria}
          required_evidence={seal.required_evidence}
        />
      </div>

      {/* Revision loop info */}
      {seal.revisions_used !== "0" && (
        <div className="mb-5 flex items-center gap-2 text-xs text-[#F59E0B]">
          <RotateCcw className="w-3.5 h-3.5" />
          Revisions: {seal.revisions_used} / {seal.revision_limit} used
        </div>
      )}

      {/* Delivery Packet Stack */}
      {deliveries.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Delivery Packet Stack</div>
          <div className="space-y-3">
            {deliveries.map((d, i) => (
              <div key={d.delivery_id} className={`rounded-xl border p-4 ${i === deliveries.length - 1 ? "border-[#7C3AED]/40 bg-[#0d0020]/50" : "border-[#1a2540] bg-[#0d1829]"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#7C3AED]">
                    {i === 0 ? "Initial Delivery" : `Revision #${d.revision_number}`}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                    d.status === "accepted" ? "text-[#16A34A] border-[#16A34A]/30 bg-[#001a08]" :
                    d.status === "rejected" ? "text-[#EF4444] border-[#EF4444]/30 bg-[#1a0000]" :
                    d.status === "revision_needed" ? "text-[#F59E0B] border-[#F59E0B]/30 bg-[#1a1000]" :
                    "text-[#CBD5E1] border-[#1e293b] bg-[#0d1829]"
                  }`}>{d.status}</span>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed mb-3">{d.delivery_summary}</p>
                <div className="space-y-1 mb-2">
                  {d.evidence_urls.map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#22D3EE] hover:underline font-mono">
                      <ExternalLink className="w-3 h-3" />
                      {url.length > 60 ? url.slice(0, 60) + "…" : url}
                    </a>
                  ))}
                </div>
                {d.contributor_notes && (
                  <p className="text-xs text-[#475569] italic">{d.contributor_notes}</p>
                )}
                <div className="mt-2 text-[10px] text-[#334155] font-mono">
                  Self-assessed: {parseInt(d.self_assessed_completion_bps) / 100}% complete
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdict Chamber */}
      {verdict && (
        <div className="mb-6">
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Verdict Chamber</div>
          <VerdictChamber verdict={verdict} totalEscrow={seal.total_escrow} />
        </div>
      )}

      {/* Delivery Form — contributor */}
      {canSubmitDelivery && (
        <div className="mb-6 bg-[#0F172A] border border-[#7C3AED]/30 rounded-xl p-5">
          <div className="text-xs text-[#7C3AED] uppercase tracking-widest mb-4">
            {isRevision ? "Submit Revision" : "Submit Delivery"}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Delivery Summary *</label>
              <textarea
                rows={3}
                value={deliveryForm.summary}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Describe what you built and how it meets the criteria…"
                className="w-full bg-[#07080C] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#7C3AED]/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Evidence URLs * (public)</label>
              <div className="space-y-2">
                {deliveryForm.evidence_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={url}
                      onChange={(e) => {
                        const u = [...deliveryForm.evidence_urls];
                        u[i] = e.target.value;
                        setDeliveryForm((f) => ({ ...f, evidence_urls: u }));
                      }}
                      placeholder="https://github.com/…"
                      className="flex-1 bg-[#07080C] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#7C3AED]/50 font-mono"
                    />
                    {i > 0 && (
                      <button type="button" onClick={() => setDeliveryForm((f) => ({ ...f, evidence_urls: f.evidence_urls.filter((_, j) => j !== i) }))}
                        className="text-[#EF4444] hover:text-[#f87171]">
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setDeliveryForm((f) => ({ ...f, evidence_urls: [...f.evidence_urls, ""] }))}
                  className="text-xs text-[#7C3AED] flex items-center gap-1 hover:text-[#a855f7] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add URL
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Self-Assessed Completion (%)</label>
              <input
                type="number" min="0" max="100" step="1"
                value={parseInt(deliveryForm.completion_bps) / 100}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, completion_bps: String(Math.round(parseFloat(e.target.value) * 100)) }))}
                className="w-full bg-[#07080C] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#7C3AED]/50"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Contributor Notes</label>
              <textarea
                rows={2}
                value={deliveryForm.notes}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional context for the validators…"
                className="w-full bg-[#07080C] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#7C3AED]/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Private Evidence Hash (optional)</label>
              <input
                value={deliveryForm.private_hash}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, private_hash: e.target.value }))}
                placeholder="0x… commitment hash of private evidence"
                className="w-full bg-[#07080C] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#7C3AED]/50 font-mono"
              />
            </div>
          </div>

          {txState.status !== "idle" && txState.status !== "done" && (
            <div className={`mt-3 rounded-lg p-3 text-xs ${txState.status === "error" ? "text-[#EF4444] bg-[#1a0000]/60 border border-[#EF4444]/20" : "text-[#CBD5E1] bg-[#0d1829] border border-[#1a2540]"}`}>
              {txState.status === "pending" && "Sending transaction…"}
              {txState.status === "waiting" && "Waiting for GenLayer consensus…"}
              {txState.status === "error" && (txState.error || "Transaction failed")}
              {txState.hash && <div className="mt-1"><TxLink hash={txState.hash} /></div>}
            </div>
          )}

          <button
            onClick={() => handleSubmitDelivery(isRevision)}
            disabled={["pending", "waiting"].includes(txState.status)}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-[#7C3AED] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#6d28d9] transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isRevision ? "Submit Revision" : "Submit Delivery"}
          </button>
        </div>
      )}

      {/* Request Verdict — buyer or contributor */}
      {canRequestVerdict && (
        <div className="mb-6 bg-[#07080C]/60 border border-[#E0B64B]/20 rounded-xl p-5">
          <div className="text-xs text-[#E0B64B] uppercase tracking-widest mb-3">Request Acceptance Verdict</div>
          <p className="text-xs text-[#475569] mb-3">
            Submitting this will trigger GenLayer validators to judge the delivery against the acceptance criteria.
            The verdict is final once consensus is reached.
          </p>
          {isBuyer && (
            <div className="mb-3">
              <label className="block text-[10px] text-[#475569] uppercase tracking-wider mb-1.5">Buyer Notes (optional)</label>
              <textarea
                rows={2}
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                placeholder="Share context for validators (e.g. what was missing, what worked)…"
                className="w-full bg-[#07080C] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/50 resize-none"
              />
            </div>
          )}
          {txState.status !== "idle" && txState.status !== "done" && (
            <div className={`mb-3 rounded-lg p-3 text-xs ${txState.status === "error" ? "text-[#EF4444] bg-[#1a0000]/60 border border-[#EF4444]/20" : "text-[#CBD5E1] bg-[#0d1829] border border-[#1a2540]"}`}>
              {txState.status === "pending" && "Sending verdict request…"}
              {txState.status === "waiting" && "GenLayer validators are reaching consensus… this may take a few minutes."}
              {txState.status === "error" && (txState.error || "Transaction failed")}
              {txState.hash && <div className="mt-1"><TxLink hash={txState.hash} /></div>}
            </div>
          )}
          <button
            onClick={handleRequestVerdict}
            disabled={["pending", "waiting"].includes(txState.status)}
            className="w-full flex items-center justify-center gap-2 bg-[#E0B64B] text-[#07080C] py-3 rounded-xl font-bold text-sm hover:bg-[#f0c85b] transition-all disabled:opacity-50"
          >
            <Scale className="w-4 h-4" />
            {txState.status === "waiting" ? "Validators deciding…" : "Request GenLayer Verdict"}
          </button>
        </div>
      )}

      {/* Settlement strip */}
      {["accepted_full", "accepted_partial", "rejected"].includes(seal.status) && (
        <div className="bg-[#0d1829] border border-[#1a2540] rounded-xl p-4">
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">GEN Settlement Strip</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[10px] text-[#475569] mb-1">Contributor Payout</div>
              <div className="text-[#16A34A] font-mono font-semibold">{weiToGen(seal.payout_amount)} GEN</div>
              <div className={`text-[10px] mt-0.5 ${seal.payout_claimed ? "text-[#16A34A]" : "text-[#F59E0B]"}`}>
                {seal.payout_claimed ? "✓ Claimed" : "Unclaimed"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#475569] mb-1">Buyer Refund</div>
              <div className="text-[#22D3EE] font-mono font-semibold">{weiToGen(seal.refund_amount)} GEN</div>
              <div className={`text-[10px] mt-0.5 ${seal.refund_claimed ? "text-[#16A34A]" : "text-[#F59E0B]"}`}>
                {seal.refund_claimed ? "✓ Claimed" : "Unclaimed"}
              </div>
            </div>
          </div>
          <a href="/claims" className="text-xs text-[#E0B64B] hover:underline">Go to Claim Center →</a>
        </div>
      )}
    </div>
  );
}
