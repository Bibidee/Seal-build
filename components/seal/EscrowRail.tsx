"use client";

import { weiToGen } from "@/lib/genlayer/sealClient";
import type { WorkSeal } from "@/lib/genlayer/types";

interface EscrowRailProps {
  seal: WorkSeal;
}

export function EscrowRail({ seal }: EscrowRailProps) {
  const total = BigInt(seal.total_escrow || "0");
  const payout = BigInt(seal.payout_amount || "0");
  const refund = BigInt(seal.refund_amount || "0");

  const payoutPct = total > 0n ? Number((payout * 10000n) / total) / 100 : 0;
  const refundPct = total > 0n ? Number((refund * 10000n) / total) / 100 : 0;
  const lockedPct = 100 - payoutPct - refundPct;

  return (
    <div className="bg-[#080B10] border border-[#182030] border-l-2 border-l-[#00C9E8] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="manifest-label">PAYOUT GATE</span>
          <div className="h-px w-12 bg-[#182030]" />
          <span className="manifest-label">ESCROW LOCK</span>
        </div>
        <span className="text-[#00C9E8] font-mono text-sm font-medium">{weiToGen(seal.total_escrow)} GEN</span>
      </div>

      {/* Gate bar */}
      <div className="h-2 bg-[#0C1118] border border-[#182030] overflow-hidden flex mb-2">
        {payoutPct > 0 && (
          <div
            className="h-full bg-[#00E87A] transition-all duration-700"
            style={{ width: `${payoutPct}%` }}
            title={`Released to contributor: ${weiToGen(seal.payout_amount)} GEN`}
          />
        )}
        {refundPct > 0 && (
          <div
            className="h-full bg-[#FF5C1A] transition-all duration-700"
            style={{ width: `${refundPct}%` }}
            title={`Refunded to buyer: ${weiToGen(seal.refund_amount)} GEN`}
          />
        )}
        {lockedPct > 0 && (
          <div
            className="h-full shimmer transition-all duration-700"
            style={{ width: `${lockedPct}%`, background: "#00C9E815" }}
            title="Locked in escrow"
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-1.5 bg-[#00E87A]" />
          <span className="text-[#5C7090]">CONTRIBUTOR</span>
          <span className="text-[#00E87A]">{weiToGen(seal.payout_amount)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-1.5 bg-[#FF5C1A]" />
          <span className="text-[#5C7090]">BUYER RETURN</span>
          <span className="text-[#FF5C1A]">{weiToGen(seal.refund_amount)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-1.5 bg-[#00C9E8]/30 border border-[#00C9E8]/30" />
          <span className="text-[#5C7090]">LOCKED</span>
        </div>
      </div>

      {/* Bond strip */}
      {seal.bond_locked && seal.bond_locked !== "0" && (
        <div className="mt-3 pt-3 border-t border-[#182030] flex items-center justify-between">
          <span className="manifest-label">CONTRIBUTOR BOND</span>
          <div className="flex items-center gap-3">
            <span className="text-[#00C9E8] font-mono text-xs">{weiToGen(seal.bond_locked)} GEN</span>
            <span className={`stamp text-[9px] ${
              seal.bond_action === "return"        ? "stamp-accept"  :
              seal.bond_action === "slash_full"    ? "stamp-breach"  :
              seal.bond_action === "slash_partial" ? "stamp-refund"  :
              "stamp-neutral"
            }`}>
              {seal.bond_action === "return"        ? "RETURN"         :
               seal.bond_action === "slash_full"    ? "SLASH FULL"     :
               seal.bond_action === "slash_partial" ? "SLASH PARTIAL"  :
               "LOCKED"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
