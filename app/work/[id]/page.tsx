"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Send, RotateCcw, Scale, Plus, Minus, ExternalLink, Package, Shield } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSeal, getDeliveryPackets, getVerdict,
  submitDelivery, submitRevision, requestAcceptanceVerdict,
  weiToGen, shortAddr, statusLabel, formatDeadline, isDeadlinePassed,
} from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { EscrowRail } from "@/components/seal/EscrowRail";
import { VerdictChamber } from "@/components/seal/VerdictChamber";
import { CriteriaGrid } from "@/components/seal/CriteriaGrid";
import { TxLink } from "@/components/ui/TxLink";
import type { WorkSeal, DeliveryPacket, SealVerdict } from "@/lib/genlayer/types";

function statusColor(status: string) {
  if (status === "accepted_full") return "#00E87A";
  if (status === "accepted_partial") return "#00C9E8";
  if (status === "revision_requested") return "#F5C000";
  if (status === "rejected") return "#FF2D4A";
  return "#00C9E8";
}

function statusStamp(status: string) {
  if (status === "accepted_full") return "stamp-accept";
  if (status === "accepted_partial") return "stamp-partial";
  if (status === "revision_requested") return "stamp-revision";
  if (status === "rejected") return "stamp-breach";
  return "stamp-partial";
}

const inputCls = "w-full bg-[#080B10] border border-[#182030] px-3 py-2.5 text-sm text-[#E8EDF5] placeholder-[#2A3A50] focus:outline-none focus:border-[#00C9E8]/50 font-mono";

export default function WorkRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();

  const [seal, setSeal]         = useState<WorkSeal | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryPacket[]>([]);
  const [verdict, setVerdict]   = useState<SealVerdict | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

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
        <div className="w-12 h-12 border border-[#182030] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#5C7090]" />
        </div>
        <h1 className="text-xl font-bold text-[#E8EDF5] mb-2" style={{ fontFamily: "var(--font-display)" }}>WORK ROOM SEALED</h1>
        <p className="text-[#5C7090] text-sm">Connect your wallet to access the work room.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-20 manifest-label">LOADING CASE…</div>;
  if (error)   return <div className="text-center py-20 font-mono text-[11px] text-[#FF2D4A]">{error}</div>;
  if (!seal)   return <div className="text-center py-20 manifest-label">CASE NOT FOUND</div>;

  const isBuyer       = address.toLowerCase() === seal.buyer.toLowerCase();
  const isContributor = address.toLowerCase() === seal.contributor?.toLowerCase();

  if (!isBuyer && !isContributor) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Shield className="w-8 h-8 text-[#FF2D4A] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#E8EDF5] mb-2" style={{ fontFamily: "var(--font-display)" }}>ACCESS DENIED</h1>
        <p className="text-[#5C7090] text-sm">Work room is accessible only to the buyer and contributor.</p>
      </div>
    );
  }

  const canSubmitDelivery  = isContributor && ["accepted", "revision_requested"].includes(seal.status);
  const canRequestVerdict  = (isBuyer || isContributor) && seal.status === "delivery_submitted";
  const isRevision         = seal.status === "revision_requested";
  const accentColor        = statusColor(seal.status);

  async function handleSubmitDelivery(isRev: boolean) {
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
      const hash = isRev ? await submitRevision(params) : await submitDelivery(params);
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Delivery status strip */}
      <div className="h-1 w-full mb-0" style={{ background: accentColor }} />

      {/* Case header */}
      <div className="dock-panel mb-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="manifest-label mb-1.5">
              WORK ROOM · CASE #{String(seal.seal_id).padStart(4, "0")}
              {" · "}
              {isDeadlinePassed(seal.deadline)
                ? <span className="text-[#FF2D4A]">DEADLINE PASSED</span>
                : <span>{formatDeadline(seal.deadline)} REMAINING</span>
              }
            </div>
            <h1 className="text-2xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>
              {seal.title}
            </h1>
            <div className="mt-2 flex items-center gap-4 flex-wrap">
              <span className="manifest-label">
                BUYER: <span className="font-mono text-[#00C9E8]">{shortAddr(seal.buyer)}</span>
              </span>
              {seal.contributor && (
                <span className="manifest-label">
                  CONTRIBUTOR: <span className="font-mono text-[#00C9E8]">{shortAddr(seal.contributor)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`stamp ${statusStamp(seal.status)}`}>{statusLabel(seal.status).toUpperCase()}</span>
            <div className="flex gap-1">
              {isBuyer       && <span className="stamp stamp-partial text-[9px]">BUYER</span>}
              {isContributor && <span className="stamp stamp-accept text-[9px]">CONTRIBUTOR</span>}
            </div>
          </div>
        </div>

        {seal.revisions_used !== "0" && (
          <div className="mt-3 pt-3 border-t border-[#182030] flex items-center gap-2 text-[11px] font-mono text-[#F5C000]">
            <RotateCcw className="w-3 h-3" />
            REVISIONS: {seal.revisions_used} / {seal.revision_limit} USED
          </div>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">

        {/* Left col: Buyer requirements */}
        <div>
          <div className="manifest-label mb-3">BUYER REQUIREMENTS</div>
          <CriteriaGrid
            deliverable_description={seal.deliverable_description}
            acceptance_criteria={seal.acceptance_criteria}
            required_evidence={seal.required_evidence}
          />
        </div>

        {/* Middle col: Submitted proof */}
        <div>
          <div className="manifest-label mb-3">SUBMITTED PROOF</div>
          {deliveries.length === 0 ? (
            <div className="dock-panel p-5 text-center">
              <Package className="w-6 h-6 text-[#2A3A50] mx-auto mb-2" />
              <p className="manifest-label">NO DELIVERY YET</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((d, i) => (
                <div key={d.delivery_id} className={`dock-panel ${i === deliveries.length - 1 ? "border-l-2 border-l-[#FF5C1A]" : ""}`}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#182030]">
                    <span className="manifest-label">
                      {i === 0 ? "INITIAL" : `REVISION #${d.revision_number}`}
                    </span>
                    <span className={`stamp text-[9px] ${
                      d.status === "accepted"       ? "stamp-accept"   :
                      d.status === "rejected"        ? "stamp-breach"   :
                      d.status === "revision_needed" ? "stamp-revision" :
                      "stamp-neutral"
                    }`}>{d.status.replace(/_/g, " ").toUpperCase()}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[#A0B4C8] text-[12px] leading-relaxed mb-2">{d.delivery_summary}</p>
                    <div className="space-y-1 mb-2">
                      {d.evidence_urls.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                          className="chain-receipt flex">
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                          {url.length > 40 ? url.slice(0, 40) + "…" : url}
                        </a>
                      ))}
                    </div>
                    {d.contributor_notes && (
                      <p className="text-[11px] text-[#5C7090] italic border-t border-[#182030] pt-2 mt-2">{d.contributor_notes}</p>
                    )}
                    <div className="manifest-label mt-1">SELF-ASSESSED: {parseInt(d.self_assessed_completion_bps) / 100}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col: Verdict + Payout gate */}
        <div>
          <div className="manifest-label mb-3">GENLAYER VERDICT</div>
          {verdict ? (
            <VerdictChamber verdict={verdict} totalEscrow={seal.total_escrow} />
          ) : (
            <div className="dock-panel p-5 text-center mb-3">
              <Scale className="w-6 h-6 text-[#2A3A50] mx-auto mb-2" />
              <p className="manifest-label">NO VERDICT YET</p>
            </div>
          )}

          <div className="mt-3">
            <div className="manifest-label mb-3">PAYOUT GATE</div>
            <EscrowRail seal={seal} />
          </div>

          {/* Settlement strip */}
          {["accepted_full", "accepted_partial", "rejected"].includes(seal.status) && (
            <div className="mt-3 dock-panel border-t-2 border-t-[#00C9E8]">
              <div className="px-4 py-3 border-b border-[#182030]">
                <span className="manifest-label">GEN SETTLEMENT</span>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="manifest-label mb-1">CONTRIBUTOR</div>
                  <div className="text-[#00E87A] font-mono text-sm font-medium">{weiToGen(seal.payout_amount)} GEN</div>
                  <div className={`manifest-label mt-0.5 ${seal.payout_claimed ? "text-[#00E87A]" : "text-[#F5C000]"}`}>
                    {seal.payout_claimed ? "CLAIMED" : "UNCLAIMED"}
                  </div>
                </div>
                <div>
                  <div className="manifest-label mb-1">BUYER REFUND</div>
                  <div className="text-[#FF5C1A] font-mono text-sm font-medium">{weiToGen(seal.refund_amount)} GEN</div>
                  <div className={`manifest-label mt-0.5 ${seal.refund_claimed ? "text-[#00E87A]" : "text-[#F5C000]"}`}>
                    {seal.refund_claimed ? "CLAIMED" : "UNCLAIMED"}
                  </div>
                </div>
              </div>
              <div className="px-4 pb-3">
                <a href="/claims" className="manifest-label text-[#00C9E8] hover:underline">GO TO CLAIM GATE →</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Submit Evidence (contributor) ── */}
      {canSubmitDelivery && (
        <div className="mb-5 border border-[#FF5C1A]/30 bg-[#0D0A00]" style={{ borderLeft: "2px solid #FF5C1A" }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#FF5C1A]/20">
            <Send className="w-3.5 h-3.5 text-[#FF5C1A]" />
            <span className="manifest-label text-[#FF5C1A]">
              {isRevision ? "SUBMIT REVISION — EVIDENCE CRATE" : "SUBMIT DELIVERY — EVIDENCE CRATE"}
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="manifest-label mb-2 block">DELIVERY SUMMARY *</label>
              <textarea rows={3} value={deliveryForm.summary}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Describe what you built and how it meets the criteria…"
                className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className="manifest-label mb-2 block">EVIDENCE URLS * (PUBLIC)</label>
              <div className="space-y-2">
                {deliveryForm.evidence_urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="manifest-label text-[#FF5C1A] flex-shrink-0">PKG-{String(i + 1).padStart(2, "0")}</span>
                    <input value={url}
                      onChange={(e) => {
                        const u = [...deliveryForm.evidence_urls];
                        u[i] = e.target.value;
                        setDeliveryForm((f) => ({ ...f, evidence_urls: u }));
                      }}
                      placeholder="https://github.com/…"
                      className={`flex-1 ${inputCls}`} />
                    {i > 0 && (
                      <button type="button"
                        onClick={() => setDeliveryForm((f) => ({ ...f, evidence_urls: f.evidence_urls.filter((_, j) => j !== i) }))}
                        className="text-[#FF2D4A] hover:text-[#FF5C7A]">
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  onClick={() => setDeliveryForm((f) => ({ ...f, evidence_urls: [...f.evidence_urls, ""] }))}
                  className="manifest-label text-[#FF5C1A] flex items-center gap-1 hover:text-[#FF7040] transition-colors">
                  <Plus className="w-3 h-3" /> ADD EVIDENCE URL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="manifest-label mb-2 block">SELF-ASSESSED COMPLETION (%)</label>
                <input type="number" min="0" max="100" step="1"
                  value={parseInt(deliveryForm.completion_bps) / 100}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, completion_bps: String(Math.round(parseFloat(e.target.value) * 100)) }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="manifest-label mb-2 block">PRIVATE EVIDENCE HASH (OPTIONAL)</label>
                <input value={deliveryForm.private_hash}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, private_hash: e.target.value }))}
                  placeholder="0x… commitment"
                  className={inputCls} />
              </div>
            </div>

            <div>
              <label className="manifest-label mb-2 block">CONTRIBUTOR NOTES</label>
              <textarea rows={2} value={deliveryForm.notes}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional context for validators…"
                className={`${inputCls} resize-none`} />
            </div>

            {txState.status !== "idle" && txState.status !== "done" && (
              <div className={`p-3 border text-[11px] font-mono ${txState.status === "error" ? "bg-[#220010] border-[#FF2D4A]/30 text-[#FF2D4A]" : "bg-[#001E28] border-[#00C9E8]/20 text-[#00C9E8]"}`}>
                {txState.status === "pending" && "SENDING TRANSACTION…"}
                {txState.status === "waiting" && "AWAITING GENLAYER CONSENSUS…"}
                {txState.status === "error" && (txState.error || "TRANSACTION FAILED")}
                {txState.hash && <div className="mt-1"><TxLink hash={txState.hash} /></div>}
              </div>
            )}

            <button
              onClick={() => handleSubmitDelivery(isRevision)}
              disabled={["pending", "waiting"].includes(txState.status)}
              className="w-full flex items-center justify-center gap-2 bg-[#FF5C1A] text-[#080B10] py-3 font-bold tracking-widest hover:bg-[#FF7040] transition-all disabled:opacity-50"
              style={{ fontFamily: "var(--font-display)", fontSize: 13 }}
            >
              <Send className="w-4 h-4" />
              {isRevision ? "SUBMIT REVISION" : "SUBMIT DELIVERY"}
            </button>
          </div>
        </div>
      )}

      {/* ── Request Verdict ── */}
      {canRequestVerdict && (
        <div className="mb-5 border border-[#00C9E8]/25 bg-[#001E28]" style={{ borderLeft: "2px solid #00C9E8" }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#00C9E8]/20">
            <Scale className="w-3.5 h-3.5 text-[#00C9E8]" />
            <span className="manifest-label text-[#00C9E8]">REQUEST GENLAYER INSPECTION VERDICT</span>
          </div>
          <div className="p-5">
            <p className="text-[11px] text-[#5C7090] mb-4 leading-relaxed">
              Triggering this sends the delivery packet to GenLayer validators for consensus-based judgement
              against the acceptance criteria. The verdict is final once consensus is reached.
            </p>
            {isBuyer && (
              <div className="mb-4">
                <label className="manifest-label mb-2 block">BUYER NOTES (OPTIONAL)</label>
                <textarea rows={2} value={buyerNotes} onChange={(e) => setBuyerNotes(e.target.value)}
                  placeholder="Share context for validators (what was missing, what worked)…"
                  className={`${inputCls} resize-none`} />
              </div>
            )}
            {txState.status !== "idle" && txState.status !== "done" && (
              <div className={`mb-4 p-3 border text-[11px] font-mono ${txState.status === "error" ? "bg-[#220010] border-[#FF2D4A]/30 text-[#FF2D4A]" : "bg-[#001E28] border-[#00C9E8]/20 text-[#00C9E8]"}`}>
                {txState.status === "pending" && "SENDING VERDICT REQUEST…"}
                {txState.status === "waiting" && "GENLAYER VALIDATORS REACHING CONSENSUS — THIS MAY TAKE A FEW MINUTES…"}
                {txState.status === "error" && (txState.error || "TRANSACTION FAILED")}
                {txState.hash && <div className="mt-1"><TxLink hash={txState.hash} /></div>}
              </div>
            )}
            <button
              onClick={handleRequestVerdict}
              disabled={["pending", "waiting"].includes(txState.status)}
              className="w-full flex items-center justify-center gap-2 bg-[#00C9E8] text-[#080B10] py-3 font-bold tracking-widest hover:bg-[#00DFFE] transition-all disabled:opacity-50"
              style={{ fontFamily: "var(--font-display)", fontSize: 13 }}
            >
              <Scale className="w-4 h-4" />
              {txState.status === "waiting" ? "VALIDATORS DECIDING…" : "REQUEST GENLAYER VERDICT"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
