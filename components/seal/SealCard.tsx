"use client";

import Link from "next/link";
import { Clock, Shield, ExternalLink } from "lucide-react";
import { weiToGen, statusColor, statusLabel, formatDeadline, isDeadlinePassed, shortAddr } from "@/lib/genlayer/sealClient";
import type { WorkSeal, SealSummary } from "@/lib/genlayer/types";

interface SealCardProps {
  seal: WorkSeal | SealSummary;
  href?: string;
}

export function SealCard({ seal, href }: SealCardProps) {
  const deadline = formatDeadline(seal.deadline);
  const passed = isDeadlinePassed(seal.deadline);

  return (
    <Link
      href={href ?? `/seal/${seal.seal_id}`}
      className="block bg-[#0F172A] border border-[#1e293b] rounded-xl p-5 hover:border-[#E0B64B]/40 hover:bg-[#0d1829] transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-4 h-4 text-[#E0B64B] flex-shrink-0" />
          <h3 className="text-[#F8FAFC] font-semibold text-sm truncate group-hover:text-[#E0B64B] transition-colors">
            {seal.title}
          </h3>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider flex-shrink-0 ${statusColor(seal.status)}`}>
          {statusLabel(seal.status)}
        </span>
      </div>

      {"category" in seal && seal.category && (
        <div className="text-[10px] text-[#475569] uppercase tracking-wider mb-3">{seal.category}</div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e293b]">
        <div className="flex items-center gap-1.5">
          <div className="text-[#E0B64B] font-mono text-sm font-semibold">{weiToGen(seal.total_escrow)}</div>
          <span className="text-[10px] text-[#475569]">GEN</span>
        </div>
        <div className={`flex items-center gap-1 text-[11px] ${passed ? "text-[#EF4444]" : "text-[#475569]"}`}>
          <Clock className="w-3 h-3" />
          {passed ? "Expired" : deadline}
        </div>
      </div>

      {seal.contributor && (
        <div className="mt-2 text-[10px] text-[#334155] font-mono">
          Contributor: {shortAddr(seal.contributor)}
        </div>
      )}
    </Link>
  );
}
