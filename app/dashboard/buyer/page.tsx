"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Plus, Clock, ExternalLink, XCircle } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSealsByBuyer, cancelUnacceptedSeal, expireSeal,
  weiToGen, statusLabel, statusColor, formatDeadline, isDeadlinePassed, explorerTx,
} from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { TxLink } from "@/components/ui/TxLink";
import { SealCard } from "@/components/seal/SealCard";
import type { WorkSeal } from "@/lib/genlayer/types";

export default function BuyerDashboard() {
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
    } catch (e) {
      setActionTx({ seal_id, status: "error" });
    }
  }

  async function handleExpire(seal_id: string) {
    setActionTx({ seal_id, status: "pending" });
    try {
      const hash = await expireSeal(seal_id);
      setActionTx({ seal_id, hash, status: "waiting" });
      await waitForTxFinality(hash as `0x${string}`);
      setActionTx({ seal_id, hash, status: "done" });
      load();
    } catch (e) {
      setActionTx({ seal_id, status: "error" });
    }
  }

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Shield className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <p className="text-[#475569] text-sm">Connect your wallet to view your buyer dashboard.</p>
      </div>
    );
  }

  const grouped = {
    active: seals.filter((s) => ["funded", "accepted", "delivery_submitted", "under_review", "revision_requested"].includes(s.status)),
    settled: seals.filter((s) => ["accepted_full", "accepted_partial", "rejected"].includes(s.status)),
    closed: seals.filter((s) => ["cancelled", "expired", "refunded", "settled"].includes(s.status)),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Buyer Dashboard</h1>
          <p className="text-xs text-[#475569] font-mono">{address}</p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 bg-[#E0B64B] text-[#07080C] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#f0c85b] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Seal
        </Link>
      </div>

      {loading && <div className="text-[#475569] text-sm py-8 text-center">Loading your seals…</div>}
      {error && <div className="text-[#EF4444] text-sm py-4 bg-[#1a0000]/50 border border-[#EF4444]/20 rounded-xl text-center">{error}</div>}

      {/* Active seals */}
      {grouped.active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Active ({grouped.active.length})</h2>
          <div className="space-y-3">
            {grouped.active.map((seal) => (
              <div key={seal.seal_id} className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <Link href={`/work/${seal.seal_id}`} className="text-[#F8FAFC] font-semibold hover:text-[#E0B64B] transition-colors">
                      {seal.title}
                    </Link>
                    <div className="text-[10px] text-[#475569] mt-0.5">Seal #{seal.seal_id}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider flex-shrink-0 ${statusColor(seal.status)}`}>
                    {statusLabel(seal.status)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#475569] mb-3">
                  <span className="text-[#E0B64B] font-mono font-semibold">{weiToGen(seal.total_escrow)} GEN</span>
                  <span className={`flex items-center gap-1 ${isDeadlinePassed(seal.deadline) ? "text-[#EF4444]" : ""}`}>
                    <Clock className="w-3 h-3" />
                    {formatDeadline(seal.deadline)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/work/${seal.seal_id}`}
                    className="text-xs text-[#22D3EE] border border-[#22D3EE]/30 rounded-lg px-3 py-1.5 hover:bg-[#001a1f] transition-all">
                    Open Work Room
                  </Link>
                  {seal.status === "funded" && (
                    <button
                      onClick={() => handleCancel(seal.seal_id)}
                      disabled={actionTx?.seal_id === seal.seal_id && actionTx.status === "pending"}
                      className="text-xs text-[#EF4444] border border-[#EF4444]/30 rounded-lg px-3 py-1.5 hover:bg-[#1a0000] transition-all disabled:opacity-50"
                    >
                      Cancel Seal
                    </button>
                  )}
                  {isDeadlinePassed(seal.deadline) && ["funded", "accepted"].includes(seal.status) && (
                    <button
                      onClick={() => handleExpire(seal.seal_id)}
                      disabled={actionTx?.seal_id === seal.seal_id && actionTx.status === "pending"}
                      className="text-xs text-[#F59E0B] border border-[#F59E0B]/30 rounded-lg px-3 py-1.5 hover:bg-[#1a1000] transition-all disabled:opacity-50"
                    >
                      Expire Seal
                    </button>
                  )}
                </div>

                {actionTx?.seal_id === seal.seal_id && actionTx.hash && (
                  <div className="mt-2">
                    <TxLink hash={actionTx.hash} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Settled */}
      {grouped.settled.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Settled ({grouped.settled.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {grouped.settled.map((seal) => (
              <div key={seal.seal_id} className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link href={`/seal/${seal.seal_id}`} className="text-sm text-[#F8FAFC] font-semibold hover:text-[#E0B64B] transition-colors truncate">
                    {seal.title}
                  </Link>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider flex-shrink-0 ${statusColor(seal.status)}`}>
                    {statusLabel(seal.status)}
                  </span>
                </div>
                <div className="text-xs text-[#475569]">
                  Payout: <span className="text-[#16A34A] font-mono">{weiToGen(seal.payout_amount)} GEN</span>
                  {" · "}
                  Refund: <span className="text-[#22D3EE] font-mono">{weiToGen(seal.refund_amount)} GEN</span>
                </div>
                {(!seal.refund_claimed && BigInt(seal.refund_amount) > 0n) && (
                  <Link href="/claims" className="mt-2 inline-block text-[11px] text-[#E0B64B] hover:underline">
                    Claim refund →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closed */}
      {grouped.closed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Closed ({grouped.closed.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.closed.map((seal) => <SealCard key={seal.seal_id} seal={seal} />)}
          </div>
        </section>
      )}

      {!loading && seals.length === 0 && (
        <div className="text-center py-16 text-[#475569] text-sm">
          No seals yet.{" "}
          <Link href="/create" className="text-[#E0B64B] hover:underline">Create your first Work Seal.</Link>
        </div>
      )}
    </div>
  );
}
