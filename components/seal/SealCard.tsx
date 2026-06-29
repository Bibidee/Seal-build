"use client";

import Link from "next/link";
import { Clock, Package } from "lucide-react";
import { weiToGen, statusColor, statusLabel, formatDeadline, isDeadlinePassed, shortAddr } from "@/lib/genlayer/sealClient";
import type { WorkSeal, SealSummary } from "@/lib/genlayer/types";

interface SealCardProps {
  seal: WorkSeal | SealSummary;
  href?: string;
}

function dockStatusClass(status: string): string {
  if (["accepted_full", "late_delivery_valid"].includes(status)) return "stamp-accept";
  if (["accepted_partial"].includes(status)) return "stamp-partial";
  if (["revision_requested"].includes(status)) return "stamp-revision";
  if (["rejected", "refunded"].includes(status)) return "stamp-breach";
  if (["cancelled", "expired"].includes(status)) return "stamp-neutral";
  return "stamp-partial"; // funded, accepted, delivery_submitted, under_review
}

export function SealCard({ seal, href }: SealCardProps) {
  const deadline = formatDeadline(seal.deadline);
  const passed = isDeadlinePassed(seal.deadline);

  return (
    <Link
      href={href ?? `/seal/${seal.seal_id}`}
      className="block dock-panel rounded-none hover:border-[#00C9E8]/40 hover:bg-[#0C1118] transition-all group"
    >
      {/* Top status strip */}
      <div className="h-0.5 w-full" style={{
        background: passed ? "#FF2D4A" :
          seal.status === "accepted_full" ? "#00E87A" :
          seal.status === "accepted_partial" ? "#00C9E8" :
          seal.status === "revision_requested" ? "#F5C000" :
          seal.status === "rejected" ? "#FF2D4A" :
          "#00C9E8"
      }} />

      <div className="p-4">
        {/* Manifest header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="w-3.5 h-3.5 text-[#00C9E8] flex-shrink-0" />
            <div className="min-w-0">
              <div className="manifest-label mb-0.5">
                {"category" in seal && seal.category ? seal.category : "MANIFEST"} · CASE #{seal.seal_id.padStart(4, "0")}
              </div>
              <h3 className="text-[#E8EDF5] font-semibold text-sm truncate group-hover:text-[#00C9E8] transition-colors"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}>
                {seal.title}
              </h3>
            </div>
          </div>
          <span className={`stamp text-[9px] flex-shrink-0 ${dockStatusClass(seal.status)}`}>
            {statusLabel(seal.status)}
          </span>
        </div>

        {/* Escrow indicator */}
        <div className="flex items-center justify-between mb-3 pt-3 border-t border-[#182030]">
          <div className="flex items-center gap-2">
            <div className="manifest-label">ESCROW</div>
            <div className="text-[#00C9E8] font-mono text-sm font-medium">{weiToGen(seal.total_escrow)}</div>
            <span className="manifest-label">GEN</span>
          </div>
          <div className={`flex items-center gap-1 text-[11px] font-mono ${passed ? "text-[#FF2D4A]" : "text-[#5C7090]"}`}>
            <Clock className="w-3 h-3" />
            {passed ? "EXPIRED" : deadline}
          </div>
        </div>

        {seal.contributor && (
          <div className="manifest-label">ASSIGNED · {shortAddr(seal.contributor)}</div>
        )}
      </div>
    </Link>
  );
}
