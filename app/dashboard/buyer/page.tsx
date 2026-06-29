"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Plus, Clock } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSealsByBuyer, cancelUnacceptedSeal, expireSeal,
  weiToGen, statusLabel, formatDeadline, isDeadlinePassed,
} from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { TxLink } from "@/components/ui/TxLink";
import { SealCard } from "@/components/seal/SealCard";
import type { WorkSeal } from "@/lib/genlayer/types";

function statusStampClass(status: string) {
  if (["accepted_full"].includes(status)) return "stamp-accept";
  if (["accepted_partial"].includes(status)) return "stamp-partial";
  if (["revision_requested"].includes(status)) return "stamp-revision";
  if (["rejected"].includes(status)) return "stamp-breach";
  if (["cancelled", "expired"].includes(status)) return "stamp-neutral";
  return "stamp-partial";
}

export default function BuyerDesk() {
  const { address } = useWallet();
  const [seals, setSeals] = useState<WorkSeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionTx, setActionTx] = useState<{ seal_id: string; hash?: string; status: string } | null>(null);

  function load() {
    if (!address) return;
    setLoading(true);
    getSealsByBuyer(address)
      .then(setSeals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [address]);

  async function handleCancel(seal_id: string) {
    setActionTx({ seal_id, status: "pending" });
    try {
      const hash = await cancelUnacceptedSeal(seal_id);
      setActionTx({ seal_id, hash, status: "waiting" });
      await waitForTxFinality(hash as `0x${string}`);
      setActionTx({ seal_id, hash, status: "done" });
      load();
    } catch { setActionTx({ seal_id, status: "error" }); }
  }

  async function handleExpire(seal_id: string) {
    setActionTx({ seal_id, status: "pending" });
    try {
      const hash = await expireSeal(seal_id);
      setActionTx({ seal_id, hash, status: "waiting" });
      await waitForTxFinality(hash as `0x${string}`);
      setActionTx({ seal_id, hash, status: "done" });
      load();
    } catch { setActionTx({ seal_id, status: "error" }); }
  }

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <LayoutGrid className="w-8 h-8 text-[#2A3A50] mx-auto mb-4" />
        <p className="text-[#5C7090] text-sm">Connect your wallet to view the Buyer Desk.</p>
      </div>
    );
  }

  const grouped = {
    active:  seals.filter((s) => ["funded", "accepted", "delivery_submitted", "under_review", "revision_requested"].includes(s.status)),
    settled: seals.filter((s) => ["accepted_full", "accepted_partial", "rejected"].includes(s.status)),
    closed:  seals.filter((s) => ["cancelled", "expired", "refunded", "settled"].includes(s.status)),
  };

  const btnCls = "text-[10px] font-mono border px-3 py-1.5 transition-all disabled:opacity-50";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="w-4 h-4 text-[#00C9E8]" />
            <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>BUYER DESK</h1>
          </div>
          <p className="manifest-label font-mono">{address}</p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 bg-[#00C9E8] text-[#080B10] px-4 py-2 font-bold tracking-widest hover:bg-[#00DFFE] transition-all text-[11px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          OPEN SEAL
        </Link>
      </div>

      {loading && <div className="manifest-label py-8 text-center">LOADING FUNDED DELIVERIES…</div>}
      {error   && <div className="py-4 text-center font-mono text-[11px] text-[#FF2D4A] border border-[#FF2D4A]/20 bg-[#220010]">{error}</div>}

      {/* Active */}
      {grouped.active.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">FUNDED DELIVERIES ({grouped.active.length})</div>
          <div className="space-y-3">
            {grouped.active.map((seal) => {
              const passed = isDeadlinePassed(seal.deadline);
              return (
                <div key={seal.seal_id} className="dock-panel" style={{ borderLeft: "2px solid #00C9E8" }}>
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#182030]">
                    <div>
                      <div className="manifest-label mb-1">
                        {seal.category || "DELIVERY"} · CASE #{String(seal.seal_id).padStart(4, "0")}
                      </div>
                      <Link href={`/work/${seal.seal_id}`}
                        className="text-[#E8EDF5] font-semibold hover:text-[#00C9E8] transition-colors text-sm"
                        style={{ fontFamily: "var(--font-display)" }}>
                        {seal.title}
                      </Link>
                    </div>
                    <span className={`stamp text-[9px] ${statusStampClass(seal.status)}`}>
                      {statusLabel(seal.status).toUpperCase()}
                    </span>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-[#00C9E8] font-mono font-medium">{weiToGen(seal.total_escrow)} GEN</span>
                      <span className={`flex items-center gap-1 font-mono ${passed ? "text-[#FF2D4A]" : "text-[#5C7090]"}`}>
                        <Clock className="w-3 h-3" />
                        {formatDeadline(seal.deadline)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/work/${seal.seal_id}`}
                        className={`${btnCls} text-[#00C9E8] border-[#00C9E8]/30 hover:bg-[#001E28]`}>
                        OPEN WORK ROOM
                      </Link>
                      {seal.status === "funded" && (
                        <button onClick={() => handleCancel(seal.seal_id)}
                          disabled={actionTx?.seal_id === seal.seal_id && actionTx.status === "pending"}
                          className={`${btnCls} text-[#FF2D4A] border-[#FF2D4A]/30 hover:bg-[#220010]`}>
                          CANCEL SEAL
                        </button>
                      )}
                      {passed && ["funded", "accepted"].includes(seal.status) && (
                        <button onClick={() => handleExpire(seal.seal_id)}
                          disabled={actionTx?.seal_id === seal.seal_id && actionTx.status === "pending"}
                          className={`${btnCls} text-[#F5C000] border-[#F5C000]/30 hover:bg-[#211D00]`}>
                          EXPIRE SEAL
                        </button>
                      )}
                    </div>
                  </div>

                  {actionTx?.seal_id === seal.seal_id && actionTx.hash && (
                    <div className="px-4 pb-3"><TxLink hash={actionTx.hash} /></div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Settled */}
      {grouped.settled.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">VERDICT RECEIPTS ({grouped.settled.length})</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.settled.map((seal) => (
              <div key={seal.seal_id} className="dock-panel p-4" style={{ borderLeft: "2px solid #5C7090" }}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link href={`/seal/${seal.seal_id}`} className="text-sm text-[#E8EDF5] font-semibold hover:text-[#00C9E8] transition-colors"
                    style={{ fontFamily: "var(--font-display)" }}>
                    {seal.title}
                  </Link>
                  <span className={`stamp text-[9px] ${statusStampClass(seal.status)}`}>
                    {statusLabel(seal.status).toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-4 text-[11px] font-mono mb-2">
                  <span className="text-[#5C7090]">PAYOUT <span className="text-[#00E87A]">{weiToGen(seal.payout_amount)} GEN</span></span>
                  <span className="text-[#5C7090]">REFUND <span className="text-[#FF5C1A]">{weiToGen(seal.refund_amount)} GEN</span></span>
                </div>
                {!seal.refund_claimed && BigInt(seal.refund_amount) > 0n && (
                  <Link href="/claims" className="manifest-label text-[#00C9E8] hover:underline">CLAIM REFUND →</Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closed */}
      {grouped.closed.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">CLOSED CASES ({grouped.closed.length})</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.closed.map((seal) => <SealCard key={seal.seal_id} seal={seal} />)}
          </div>
        </section>
      )}

      {!loading && seals.length === 0 && (
        <div className="text-center py-16 text-[#5C7090] text-sm">
          No funded deliveries yet.{" "}
          <Link href="/create" className="text-[#00C9E8] hover:underline">Open your first Work Seal.</Link>
        </div>
      )}
    </div>
  );
}
