"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Clock, ExternalLink, Package } from "lucide-react";
import {
  getSealPublic, getDeliveryPackets, getVerdict,
  weiToGen, shortAddr, statusLabel, formatDeadline, isDeadlinePassed, explorerAddress,
} from "@/lib/genlayer/sealClient";
import { EscrowRail } from "@/components/seal/EscrowRail";
import { VerdictChamber } from "@/components/seal/VerdictChamber";
import { CriteriaGrid } from "@/components/seal/CriteriaGrid";
import type { WorkSeal, DeliveryPacket, SealVerdict } from "@/lib/genlayer/types";

function dockStatusStamp(status: string) {
  const map: Record<string, string> = {
    funded: "stamp-partial", accepted: "stamp-partial", delivery_submitted: "stamp-partial",
    under_review: "stamp-partial", revision_requested: "stamp-revision",
    accepted_full: "stamp-accept", accepted_partial: "stamp-partial",
    rejected: "stamp-breach", cancelled: "stamp-neutral", expired: "stamp-neutral",
  };
  return map[status] ?? "stamp-neutral";
}

export default function PublicProofPage() {
  const { id } = useParams<{ id: string }>();
  const [seal, setSeal]           = useState<WorkSeal | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryPacket[]>([]);
  const [verdict, setVerdict]     = useState<SealVerdict | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
      setError("Contract not deployed"); setLoading(false); return;
    }
    Promise.all([getSealPublic(id), getDeliveryPackets(id)])
      .then(async ([s, d]) => {
        setSeal(s); setDeliveries(d);
        if (s?.latest_verdict_id) {
          const v = await getVerdict(s.latest_verdict_id).catch(() => null);
          setVerdict(v);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 manifest-label">LOADING CASE…</div>;
  if (error)   return <div className="text-center py-20 font-mono text-[11px] text-[#FF2D4A]">{error}</div>;
  if (!seal)   return <div className="text-center py-20 manifest-label">CASE NOT FOUND</div>;

  if ((seal as { visibility_mode?: string }).visibility_mode === "private") {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-12 h-12 border border-[#182030] flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#5C7090]" />
        </div>
        <h1 className="text-xl font-bold text-[#E8EDF5] mb-2" style={{ fontFamily: "var(--font-display)" }}>
          SEALED — PRIVATE CASE
        </h1>
        <p className="text-[#5C7090] text-sm">{seal.title}</p>
        <p className="text-[#2A3A50] text-xs mt-2">Only the buyer and contributor can access this case.</p>
      </div>
    );
  }

  const passed = isDeadlinePassed(seal.deadline);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Status strip */}
      <div className="h-1 w-full mb-0" style={{
        background: seal.status === "accepted_full" ? "#00E87A" :
          seal.status === "accepted_partial" ? "#00C9E8" :
          seal.status === "rejected" ? "#FF2D4A" :
          seal.status === "revision_requested" ? "#F5C000" :
          "#00C9E8"
      }} />

      {/* Manifest header */}
      <div className="dock-panel mb-5 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="manifest-label mb-1.5">
              {"category" in seal && seal.category ? seal.category : "DELIVERY"} · CASE #{String(seal.seal_id).padStart(4, "0")}
            </div>
            <h1 className="text-2xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>
              {seal.title}
            </h1>
          </div>
          <span className={`stamp ${dockStatusStamp(seal.status)}`}>{statusLabel(seal.status).toUpperCase()}</span>
        </div>

        {/* Parties + deadline row */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#182030]">
          <div>
            <div className="manifest-label mb-1">BUYER</div>
            <a href={explorerAddress(seal.buyer)} target="_blank" rel="noopener noreferrer"
              className="chain-receipt">
              {shortAddr(seal.buyer)} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div>
            <div className="manifest-label mb-1">CONTRIBUTOR</div>
            {seal.contributor ? (
              <a href={explorerAddress(seal.contributor)} target="_blank" rel="noopener noreferrer"
                className="chain-receipt">
                {shortAddr(seal.contributor)} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : (
              <span className="manifest-label text-[#2A3A50]">OPEN</span>
            )}
          </div>
          <div>
            <div className="manifest-label mb-1">DEADLINE</div>
            <span className={`font-mono text-[11px] flex items-center gap-1 ${passed ? "text-[#FF2D4A]" : "text-[#5C7090]"}`}>
              <Clock className="w-3 h-3" />
              {formatDeadline(seal.deadline)}
            </span>
          </div>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Left: Buyer requirements */}
        <div className="lg:col-span-2">
          <div className="manifest-label mb-3">DELIVERY REQUIREMENTS</div>
          <CriteriaGrid
            deliverable_description={seal.deliverable_description || ""}
            acceptance_criteria={seal.acceptance_criteria || ""}
            required_evidence={seal.required_evidence || ""}
          />
        </div>

        {/* Right: Payout gate */}
        <div>
          <div className="manifest-label mb-3">PAYOUT GATE</div>
          <EscrowRail seal={seal} />

          {/* Settlement result */}
          {["accepted_full", "accepted_partial", "rejected"].includes(seal.status) && (
            <div className="mt-3 dock-panel border-t-2 border-t-[#00C9E8]">
              <div className="px-4 py-3 border-b border-[#182030]">
                <span className="manifest-label">SETTLEMENT RECEIPT</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <div className="manifest-label mb-1">CONTRIBUTOR PAYOUT</div>
                  <div className="text-[#00E87A] font-mono font-medium">{weiToGen(seal.payout_amount)} GEN</div>
                  <div className={`manifest-label mt-0.5 ${seal.payout_claimed ? "text-[#00E87A]" : "text-[#F5C000]"}`}>
                    {seal.payout_claimed ? "CLAIMED" : "UNCLAIMED"}
                  </div>
                </div>
                <div>
                  <div className="manifest-label mb-1">BUYER REFUND</div>
                  <div className="text-[#FF5C1A] font-mono font-medium">{weiToGen(seal.refund_amount)} GEN</div>
                  <div className={`manifest-label mt-0.5 ${seal.refund_claimed ? "text-[#00E87A]" : "text-[#F5C000]"}`}>
                    {seal.refund_claimed ? "CLAIMED" : "UNCLAIMED"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GenLayer Verdict */}
      {verdict && (
        <div className="mb-5">
          <div className="manifest-label mb-3">GENLAYER INSPECTION VERDICT</div>
          <VerdictChamber verdict={verdict} totalEscrow={seal.total_escrow} />
        </div>
      )}

      {/* Delivery evidence — public only */}
      {deliveries.length > 0 && (
        <div className="mb-5">
          <div className="manifest-label mb-3">DELIVERY EVIDENCE · PUBLIC PROOF</div>
          <div className="space-y-3">
            {deliveries.map((d, i) => (
              <div key={d.delivery_id} className="dock-panel border-l-2 border-l-[#5C7090]">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#182030]">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-[#5C7090]" />
                    <span className="manifest-label">
                      {i === 0 ? "INITIAL DELIVERY" : `REVISION #${d.revision_number}`} · PKT-{d.delivery_id.split(":")[1] || d.revision_number}
                    </span>
                  </div>
                  <span className={`stamp text-[9px] ${
                    d.status === "accepted"         ? "stamp-accept"   :
                    d.status === "rejected"          ? "stamp-breach"   :
                    d.status === "revision_needed"   ? "stamp-revision" :
                    "stamp-neutral"
                  }`}>{d.status.replace(/_/g, " ").toUpperCase()}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[#A0B4C8] text-sm leading-relaxed mb-3">{d.delivery_summary}</p>
                  <div className="space-y-1.5">
                    {d.evidence_urls.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                        className="chain-receipt flex-inline hover:underline">
                        <ExternalLink className="w-2.5 h-2.5" />
                        {url.length > 64 ? url.slice(0, 64) + "…" : url}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
