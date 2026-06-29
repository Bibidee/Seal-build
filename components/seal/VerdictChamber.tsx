"use client";

import { CheckCircle, XCircle, AlertTriangle, RotateCcw, Scale, RefreshCw } from "lucide-react";
import type { SealVerdict } from "@/lib/genlayer/types";
import { weiToGen } from "@/lib/genlayer/sealClient";

interface VerdictChamberProps {
  verdict: SealVerdict;
  totalEscrow?: string;
}

const VERDICT_CONFIG: Record<string, {
  icon: typeof CheckCircle;
  stampClass: string;
  stampLabel: string;
  accentColor: string;
  borderColor: string;
  bgColor: string;
}> = {
  meets_criteria:           { icon: CheckCircle,   stampClass: "stamp-accept",   stampLabel: "DELIVERY ACCEPTED — FULL PAYMENT",   accentColor: "#00E87A", borderColor: "#00E87A40", bgColor: "#001F0F" },
  late_delivery_valid:      { icon: CheckCircle,   stampClass: "stamp-accept",   stampLabel: "LATE — DELIVERY VALID",              accentColor: "#00E87A", borderColor: "#00E87A40", bgColor: "#001F0F" },
  partially_meets_criteria: { icon: Scale,         stampClass: "stamp-partial",  stampLabel: "PARTIAL ACCEPTANCE — SPLIT PAYOUT",  accentColor: "#00C9E8", borderColor: "#00C9E840", bgColor: "#001E28" },
  revision_needed:          { icon: RotateCcw,     stampClass: "stamp-revision", stampLabel: "REVISION NOTICE — DELIVERY RETURNED", accentColor: "#F5C000", borderColor: "#F5C00040", bgColor: "#211D00" },
  does_not_meet_criteria:   { icon: XCircle,       stampClass: "stamp-breach",   stampLabel: "REJECTED — BUYER REFUND ISSUED",     accentColor: "#FF2D4A", borderColor: "#FF2D4A40", bgColor: "#220010" },
  late_delivery_invalid:    { icon: XCircle,       stampClass: "stamp-breach",   stampLabel: "LATE & INVALID — REFUND ISSUED",     accentColor: "#FF2D4A", borderColor: "#FF2D4A40", bgColor: "#220010" },
  fraudulent_submission:    { icon: XCircle,       stampClass: "stamp-breach",   stampLabel: "BREACH DETECTED — BOND SLASHED",     accentColor: "#FF2D4A", borderColor: "#FF2D4A40", bgColor: "#220010" },
  unverifiable:             { icon: AlertTriangle, stampClass: "stamp-neutral",  stampLabel: "UNVERIFIABLE — EVIDENCE REVIEW",     accentColor: "#5C7090", borderColor: "#5C709040", bgColor: "#111722" },
  evidence_insufficient:    { icon: AlertTriangle, stampClass: "stamp-neutral",  stampLabel: "INSUFFICIENT EVIDENCE",              accentColor: "#5C7090", borderColor: "#5C709040", bgColor: "#111722" },
};

export function VerdictChamber({ verdict, totalEscrow }: VerdictChamberProps) {
  const cfg = VERDICT_CONFIG[verdict.verdict_status] ?? {
    icon: Scale,
    stampClass: "stamp-neutral",
    stampLabel: verdict.verdict_status.toUpperCase().replace(/_/g, " "),
    accentColor: "#5C7090",
    borderColor: "#5C709040",
    bgColor: "#111722",
  };
  const Icon = cfg.icon;
  const payout_bps = parseInt(verdict.payout_bps || "0");
  const confidence = parseInt(verdict.confidence || "0");

  const payoutAmount = totalEscrow
    ? BigInt(totalEscrow) * BigInt(payout_bps) / 10000n
    : null;

  return (
    <div
      className="border"
      style={{ background: cfg.bgColor, borderColor: cfg.borderColor, borderLeftColor: cfg.accentColor, borderLeftWidth: 3 }}
    >
      {/* Top stamp banner */}
      <div className="px-5 py-3 border-b" style={{ borderColor: cfg.borderColor }}>
        <div className="manifest-label mb-2">GENLAYER INSPECTION VERDICT</div>
        <div className={`stamp ${cfg.stampClass}`} style={{ fontSize: 14 }}>
          <Icon className="w-4 h-4 flex-shrink-0" />
          {cfg.stampLabel}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Short reason */}
        <p className="text-[#A0B4C8] text-sm leading-relaxed mb-4 font-mono text-[12px]">
          {verdict.short_reason}
        </p>

        {/* Data grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="bg-[#080B10] border border-[#182030] p-3">
            <div className="manifest-label mb-1.5">PAYMENT ACTION</div>
            <div className="text-[11px] font-mono" style={{ color: cfg.accentColor }}>
              {verdict.payment_action.replace(/_/g, " ").toUpperCase()}
            </div>
          </div>
          <div className="bg-[#080B10] border border-[#182030] p-3">
            <div className="manifest-label mb-1.5">PAYOUT RATE</div>
            <div className="text-[#00C9E8] font-mono text-sm font-medium">
              {payout_bps / 100}%
              {payoutAmount !== null && (
                <span className="text-[#5C7090] text-[10px] ml-1 block">
                  {weiToGen(payoutAmount.toString())} GEN
                </span>
              )}
            </div>
          </div>
          <div className="bg-[#080B10] border border-[#182030] p-3">
            <div className="manifest-label mb-1.5">BOND ACTION</div>
            <div className="text-[11px] font-mono text-[#E8EDF5]">
              {verdict.bond_action.replace(/_/g, " ").toUpperCase()}
            </div>
          </div>
          <div className="bg-[#080B10] border border-[#182030] p-3">
            <div className="manifest-label mb-1.5">CONFIDENCE</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-[#182030]">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${confidence}%`, background: cfg.accentColor }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#5C7090]">{confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
