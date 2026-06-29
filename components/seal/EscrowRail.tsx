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
    <div className="bg-[#0d1829] border border-[#1a2540] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-[#475569]">Escrow Rail</span>
        <span className="text-[#E0B64B] font-mono text-sm font-semibold">{weiToGen(seal.total_escrow)} GEN</span>
      </div>

      {/* Rail bar */}
      <div className="h-3 bg-[#1e293b] rounded-full overflow-hidden flex">
        {payoutPct > 0 && (
          <div
            className="h-full bg-[#16A34A] transition-all duration-500"
            style={{ width: `${payoutPct}%` }}
            title={`Released: ${weiToGen(seal.payout_amount)} GEN`}
          />
        )}
        {refundPct > 0 && (
          <div
            className="h-full bg-[#22D3EE] transition-all duration-500"
            style={{ width: `${refundPct}%` }}
            title={`Refunded: ${weiToGen(seal.refund_amount)} GEN`}
          />
        )}
        {lockedPct > 0 && (
          <div
            className="h-full bg-[#E0B64B]/20 shimmer transition-all duration-500"
            style={{ width: `${lockedPct}%` }}
            title="Locked in escrow"
          />
        )}
      </div>

      <div className="flex items-center gap-4 mt-2.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-[#16A34A]" />
          <span className="text-[#475569]">Released</span>
          <span className="text-[#CBD5E1] font-mono">{weiToGen(seal.payout_amount)} GEN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-[#22D3EE]" />
          <span className="text-[#475569]">Refund</span>
          <span className="text-[#CBD5E1] font-mono">{weiToGen(seal.refund_amount)} GEN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-[#E0B64B]/40" />
          <span className="text-[#475569]">Locked</span>
        </div>
      </div>

      {seal.bond_locked && seal.bond_locked !== "0" && (
        <div className="mt-3 pt-3 border-t border-[#1a2540] flex items-center justify-between text-[11px]">
          <span className="text-[#475569]">Contributor Bond</span>
          <div className="flex items-center gap-2">
            <span className="text-[#E0B64B] font-mono">{weiToGen(seal.bond_locked)} GEN</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${
              seal.bond_action === "return" ? "text-[#16A34A] bg-[#001a08]" :
              seal.bond_action === "slash_full" ? "text-[#EF4444] bg-[#1a0000]" :
              seal.bond_action === "slash_partial" ? "text-[#F59E0B] bg-[#1a1000]" :
              "text-[#64748B] bg-[#0a0f1a]"
            }`}>
              {seal.bond_action || "locked"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
