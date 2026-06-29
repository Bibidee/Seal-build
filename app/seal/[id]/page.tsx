"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shield, Clock, User, ExternalLink, Package } from "lucide-react";
import {
  getSealPublic, getDeliveryPackets, getVerdict,
  weiToGen, shortAddr, statusLabel, statusColor, formatDeadline, isDeadlinePassed, explorerAddress,
} from "@/lib/genlayer/sealClient";
import { EscrowRail } from "@/components/seal/EscrowRail";
import { VerdictChamber } from "@/components/seal/VerdictChamber";
import { CriteriaGrid } from "@/components/seal/CriteriaGrid";
import { Badge } from "@/components/ui/Badge";
import type { WorkSeal, DeliveryPacket, SealVerdict } from "@/lib/genlayer/types";

export default function SealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [seal, setSeal] = useState<WorkSeal | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryPacket[]>([]);
  const [verdict, setVerdict] = useState<SealVerdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!addr) {
      setError("Contract not deployed");
      setLoading(false);
      return;
    }
    Promise.all([
      getSealPublic(id),
      getDeliveryPackets(id),
    ])
      .then(async ([s, d]) => {
        setSeal(s);
        setDeliveries(d);
        if (s?.latest_verdict_id) {
          const v = await getVerdict(s.latest_verdict_id).catch(() => null);
          setVerdict(v);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load seal"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-[#475569] text-sm">Loading seal…</div>;
  if (error) return <div className="text-center py-20 text-[#EF4444] text-sm">{error}</div>;
  if (!seal) return <div className="text-center py-20 text-[#475569] text-sm">Seal not found.</div>;

  if ((seal as { visibility_mode?: string }).visibility_mode === "private") {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Shield className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#F8FAFC] mb-2">{seal.title}</h1>
        <p className="text-[#475569] text-sm">This seal is private. Only the buyer and contributor can view details.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-1 font-mono">Seal #{seal.seal_id}</div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">{seal.title}</h1>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border uppercase tracking-wider flex-shrink-0 ${statusColor(seal.status)}`}>
            {statusLabel(seal.status)}
          </span>
        </div>

        {"category" in seal && seal.category && (
          <div className="text-[10px] text-[#475569] uppercase tracking-wider">{seal.category}</div>
        )}
      </div>

      {/* Escrow Rail */}
      <div className="mb-5">
        <EscrowRail seal={seal} />
      </div>

      {/* Meta strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-3">
          <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Buyer</div>
          <a href={explorerAddress(seal.buyer)} target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-[#22D3EE] hover:underline flex items-center gap-1">
            {shortAddr(seal.buyer)} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-3">
          <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Contributor</div>
          {seal.contributor ? (
            <a href={explorerAddress(seal.contributor)} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono text-[#22D3EE] hover:underline flex items-center gap-1">
              {shortAddr(seal.contributor)} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-xs text-[#334155]">Open</span>
          )}
        </div>
        <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-3">
          <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Deadline</div>
          <div className={`text-xs font-mono flex items-center gap-1 ${isDeadlinePassed(seal.deadline) ? "text-[#EF4444]" : "text-[#CBD5E1]"}`}>
            <Clock className="w-3 h-3" />
            {formatDeadline(seal.deadline)}
          </div>
        </div>
      </div>

      {/* Criteria */}
      <div className="mb-6">
        <CriteriaGrid
          deliverable_description={seal.deliverable_description || ""}
          acceptance_criteria={seal.acceptance_criteria || ""}
          required_evidence={seal.required_evidence || ""}
        />
      </div>

      {/* Verdict */}
      {verdict && (
        <div className="mb-6">
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Verdict Chamber</div>
          <VerdictChamber verdict={verdict} totalEscrow={seal.total_escrow} />
        </div>
      )}

      {/* Delivery packets — public evidence only */}
      {deliveries.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Delivery Evidence</div>
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div key={d.delivery_id} className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-[#7C3AED]" />
                    <span className="text-xs text-[#CBD5E1] font-mono">Delivery #{d.revision_number}</span>
                  </div>
                  <Badge variant={
                    d.status === "accepted" ? "green" :
                    d.status === "partially_accepted" ? "cyan" :
                    d.status === "rejected" ? "red" :
                    d.status === "revision_needed" ? "amber" :
                    "purple"
                  }>{d.status}</Badge>
                </div>
                <p className="text-[#94a3b8] text-sm mb-3 leading-relaxed">{d.delivery_summary}</p>
                <div className="space-y-1">
                  {d.evidence_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#22D3EE] hover:underline font-mono">
                      <ExternalLink className="w-3 h-3" />
                      {url.length > 60 ? url.slice(0, 60) + "…" : url}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payout result */}
      {["accepted_full", "accepted_partial", "rejected"].includes(seal.status) && (
        <div className="bg-[#0d1829] border border-[#1a2540] rounded-xl p-4">
          <div className="text-[10px] text-[#475569] uppercase tracking-widest mb-3">Settlement Result</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-[#475569] mb-1">Contributor Payout</div>
              <div className="text-[#16A34A] font-mono font-semibold">{weiToGen(seal.payout_amount)} GEN</div>
              <div className={`text-[10px] mt-0.5 ${seal.payout_claimed ? "text-[#16A34A]" : "text-[#F59E0B]"}`}>
                {seal.payout_claimed ? "Claimed" : "Unclaimed"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#475569] mb-1">Buyer Refund</div>
              <div className="text-[#22D3EE] font-mono font-semibold">{weiToGen(seal.refund_amount)} GEN</div>
              <div className={`text-[10px] mt-0.5 ${seal.refund_claimed ? "text-[#16A34A]" : "text-[#F59E0B]"}`}>
                {seal.refund_claimed ? "Claimed" : "Unclaimed"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
