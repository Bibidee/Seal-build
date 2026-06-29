"use client";

import { useEffect, useState } from "react";
import { Radio, ArrowUpRight, ArrowDownLeft, RotateCcw, Anchor, TriangleAlert } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { getWalletActivity, weiToGen } from "@/lib/genlayer/sealClient";
import type { ActivityEvent } from "@/lib/genlayer/types";

const EVENT_CONFIG: Record<string, { label: string; accentColor: string; icon: typeof Radio; stampClass: string }> = {
  seal_created:         { label: "SEAL CREATED",          accentColor: "#00C9E8", icon: Anchor,         stampClass: "stamp-partial"  },
  seal_accepted:        { label: "SEAL ACCEPTED",         accentColor: "#FF5C1A", icon: ArrowDownLeft,  stampClass: "stamp-refund"   },
  seal_cancelled:       { label: "SEAL CANCELLED",        accentColor: "#5C7090", icon: Radio,          stampClass: "stamp-neutral"  },
  seal_expired:         { label: "SEAL EXPIRED",          accentColor: "#5C7090", icon: Radio,          stampClass: "stamp-neutral"  },
  delivery_submitted:   { label: "DELIVERY SUBMITTED",    accentColor: "#FF5C1A", icon: ArrowUpRight,   stampClass: "stamp-refund"   },
  revision_submitted:   { label: "REVISION SUBMITTED",    accentColor: "#F5C000", icon: RotateCcw,      stampClass: "stamp-revision" },
  verdict_issued:       { label: "VERDICT ISSUED",        accentColor: "#00C9E8", icon: Radio,          stampClass: "stamp-partial"  },
  payout_claimed:       { label: "PAYOUT CLAIMED",        accentColor: "#00E87A", icon: ArrowDownLeft,  stampClass: "stamp-accept"   },
  refund_claimed:       { label: "REFUND CLAIMED",        accentColor: "#FF5C1A", icon: ArrowDownLeft,  stampClass: "stamp-refund"   },
  bond_returned:        { label: "BOND RETURNED",         accentColor: "#00C9E8", icon: ArrowDownLeft,  stampClass: "stamp-partial"  },
  bond_slashed_full:    { label: "BOND SLASHED — FULL",   accentColor: "#FF2D4A", icon: TriangleAlert,  stampClass: "stamp-breach"   },
  bond_slashed_partial: { label: "BOND SLASHED — PARTIAL",accentColor: "#F5C000", icon: TriangleAlert,  stampClass: "stamp-revision" },
  bond_returned_expiry: { label: "BOND RETURNED (EXPIRY)",accentColor: "#00C9E8", icon: ArrowDownLeft,  stampClass: "stamp-partial"  },
};

export default function ActivityLogPage() {
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
        <Radio className="w-8 h-8 text-[#2A3A50] mx-auto mb-4" />
        <p className="text-[#5C7090] text-sm">Connect your wallet to view activity.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Radio className="w-4 h-4 text-[#00C9E8]" />
          <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>ACTIVITY LOG</h1>
        </div>
        <p className="manifest-label font-mono">{address}</p>
      </div>

      {loading && <div className="manifest-label py-8 text-center">LOADING ACTIVITY…</div>}

      {!loading && events.length === 0 && (
        <div className="text-center py-16 text-[#5C7090] text-sm">No activity recorded yet.</div>
      )}

      <div className="space-y-2">
        {events.map((ev, i) => {
          const cfg = EVENT_CONFIG[ev.event] ?? { label: ev.event.toUpperCase().replace(/_/g, " "), accentColor: "#5C7090", icon: Radio, stampClass: "stamp-neutral" };
          const Icon = cfg.icon;
          const ts = ev.ts ? new Date(parseInt(ev.ts) * 1000).toLocaleString() : "";

          return (
            <div key={i} className="dock-panel flex items-center gap-4 px-4 py-3">
              {/* Icon */}
              <div className="w-8 h-8 border flex items-center justify-center flex-shrink-0"
                style={{ background: `${cfg.accentColor}10`, borderColor: `${cfg.accentColor}30` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: cfg.accentColor }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={`stamp text-[9px] ${cfg.stampClass}`}>{cfg.label}</span>
                <div className="manifest-label mt-1.5">
                  CASE #{ev.seal_id}
                  {ev.amount && <span className="ml-3 font-mono" style={{ color: cfg.accentColor }}>{weiToGen(ev.amount)} GEN</span>}
                </div>
              </div>

              {/* Timestamp */}
              <div className="manifest-label text-right flex-shrink-0">{ts}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
