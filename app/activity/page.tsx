"use client";

import { useEffect, useState } from "react";
import { Activity, Shield, ArrowUpRight, ArrowDownLeft, RotateCcw } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { getWalletActivity, weiToGen } from "@/lib/genlayer/sealClient";
import type { ActivityEvent } from "@/lib/genlayer/types";

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: typeof Activity }> = {
  seal_created:         { label: "Seal Created",        color: "#E0B64B", icon: Shield },
  seal_accepted:        { label: "Seal Accepted",       color: "#22D3EE", icon: ArrowDownLeft },
  seal_cancelled:       { label: "Seal Cancelled",      color: "#64748B", icon: Activity },
  seal_expired:         { label: "Seal Expired",        color: "#64748B", icon: Activity },
  delivery_submitted:   { label: "Delivery Submitted",  color: "#7C3AED", icon: ArrowUpRight },
  revision_submitted:   { label: "Revision Submitted",  color: "#7C3AED", icon: RotateCcw },
  verdict_issued:       { label: "Verdict Issued",      color: "#E0B64B", icon: Activity },
  payout_claimed:       { label: "Payout Claimed",      color: "#16A34A", icon: ArrowDownLeft },
  refund_claimed:       { label: "Refund Claimed",      color: "#22D3EE", icon: ArrowDownLeft },
  bond_returned:        { label: "Bond Returned",       color: "#E0B64B", icon: ArrowDownLeft },
  bond_slashed_full:    { label: "Bond Slashed (Full)", color: "#EF4444", icon: Activity },
  bond_slashed_partial: { label: "Bond Slashed (Partial)", color: "#F59E0B", icon: Activity },
  bond_returned_expiry: { label: "Bond Returned (Expiry)", color: "#E0B64B", icon: ArrowDownLeft },
};

export default function ActivityPage() {
  const { address } = useWallet();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getWalletActivity(address)
      .then((e) => setEvents([...e].reverse()))
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Activity className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <p className="text-[#475569] text-sm">Connect your wallet to view activity.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Wallet Activity</h1>
        <p className="text-xs text-[#475569] font-mono">{address}</p>
      </div>

      {loading && <div className="text-[#475569] text-sm text-center py-8">Loading activity…</div>}

      {!loading && events.length === 0 && (
        <div className="text-center py-16 text-[#475569] text-sm">No activity recorded yet.</div>
      )}

      <div className="space-y-2">
        {events.map((ev, i) => {
          const cfg = EVENT_CONFIG[ev.event] ?? { label: ev.event, color: "#64748B", icon: Activity };
          const Icon = cfg.icon;
          const ts = ev.ts ? new Date(parseInt(ev.ts) * 1000).toLocaleString() : "";

          return (
            <div key={i} className="flex items-center gap-4 bg-[#0F172A] border border-[#1e293b] rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                <Icon className="w-4 h-4" style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#CBD5E1]">{cfg.label}</div>
                <div className="text-[10px] text-[#475569] font-mono mt-0.5">
                  Seal #{ev.seal_id}
                  {ev.amount && <span> · {weiToGen(ev.amount)} GEN</span>}
                </div>
              </div>
              <div className="text-[10px] text-[#334155] text-right flex-shrink-0">{ts}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
