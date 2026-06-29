"use client";

import { CheckCircle, XCircle, AlertTriangle, RotateCcw, Scale } from "lucide-react";
import type { SealVerdict } from "@/lib/genlayer/types";
import { weiToGen } from "@/lib/genlayer/sealClient";
import { Badge } from "@/components/ui/Badge";

interface VerdictChamberProps {
  verdict: SealVerdict;
  totalEscrow?: string;
}

const VERDICT_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string; bg: string }> = {
  meets_criteria:          { icon: CheckCircle, color: "#16A34A", label: "Meets Criteria",         bg: "#001a08" },
  late_delivery_valid:     { icon: CheckCircle, color: "#16A34A", label: "Late — Valid",            bg: "#001a08" },
  partially_meets_criteria:{ icon: Scale,       color: "#22D3EE", label: "Partially Meets",         bg: "#001a1f" },
  revision_needed:         { icon: RotateCcw,   color: "#F59E0B", label: "Revision Needed",         bg: "#1a1000" },
  does_not_meet_criteria:  { icon: XCircle,     color: "#EF4444", label: "Does Not Meet",           bg: "#1a0000" },
  late_delivery_invalid:   { icon: XCircle,     color: "#EF4444", label: "Late — Invalid",          bg: "#1a0000" },
  fraudulent_submission:   { icon: XCircle,     color: "#EF4444", label: "Fraudulent",              bg: "#1a0000" },
  unverifiable:            { icon: AlertTriangle, color: "#64748B", label: "Unverifiable",           bg: "#0a0f1a" },
  evidence_insufficient:   { icon: AlertTriangle, color: "#64748B", label: "Insufficient Evidence",  bg: "#0a0f1a" },
};

export function VerdictChamber({ verdict, totalEscrow }: VerdictChamberProps) {
  const cfg = VERDICT_CONFIG[verdict.verdict_status] ?? {
    icon: Scale, color: "#64748B", label: verdict.verdict_status, bg: "#0a0f1a",
  };
  const Icon = cfg.icon;
  const payout_bps = parseInt(verdict.payout_bps || "0");
  const confidence = parseInt(verdict.confidence || "0");

  const payoutAmount = totalEscrow
    ? BigInt(totalEscrow) * BigInt(payout_bps) / 10000n
    : null;

  return (
    <div
      className="rounded-xl border p-5 relative overflow-hidden"
      style={{ background: cfg.bg, borderColor: `${cfg.color}40` }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
        style={{ background: cfg.color, transform: "translate(30%, -30%)" }} />

      <div className="flex items-start gap-4 relative">
        <div className="p-3 rounded-xl border" style={{ background: `${cfg.color}15`, borderColor: `${cfg.color}30` }}>
          <Icon className="w-6 h-6" style={{ color: cfg.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs uppercase tracking-widest" style={{ color: cfg.color }}>Verdict Chamber</span>
            <Badge variant={
              verdict.verdict_status === "meets_criteria" || verdict.verdict_status === "late_delivery_valid" ? "green" :
              verdict.verdict_status === "partially_meets_criteria" ? "cyan" :
              verdict.verdict_status === "revision_needed" ? "amber" :
              verdict.verdict_status === "fraudulent_submission" || verdict.verdict_status === "does_not_meet_criteria" || verdict.verdict_status === "late_delivery_invalid" ? "red" :
              "slate"
            }>
              {cfg.label}
            </Badge>
          </div>

          <p className="text-[#CBD5E1] text-sm leading-relaxed mb-3">
            {verdict.short_reason}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="bg-[#07080C]/50 rounded-lg p-2.5">
              <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Payment</div>
              <div className="text-xs font-mono" style={{ color: cfg.color }}>
                {verdict.payment_action.replace(/_/g, " ")}
              </div>
            </div>
            <div className="bg-[#07080C]/50 rounded-lg p-2.5">
              <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Payout</div>
              <div className="text-xs font-mono text-[#E0B64B]">
                {payout_bps / 100}%
                {payoutAmount !== null && (
                  <span className="text-[#475569] ml-1">({weiToGen(payoutAmount.toString())} GEN)</span>
                )}
              </div>
            </div>
            <div className="bg-[#07080C]/50 rounded-lg p-2.5">
              <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Bond</div>
              <div className="text-xs font-mono text-[#CBD5E1]">{verdict.bond_action}</div>
            </div>
            <div className="bg-[#07080C]/50 rounded-lg p-2.5">
              <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-1">Confidence</div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${confidence}%`, background: cfg.color }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">{confidence}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
