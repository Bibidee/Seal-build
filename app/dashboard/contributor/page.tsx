"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Clock, Shield } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSealsByContributor, acceptSeal, genToWei,
  weiToGen, statusLabel, statusColor, formatDeadline, isDeadlinePassed,
} from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { TxLink } from "@/components/ui/TxLink";
import { SealCard } from "@/components/seal/SealCard";
import type { WorkSeal } from "@/lib/genlayer/types";

export default function ContributorDashboard() {
  const { address } = useWallet();
  const [seals, setSeals] = useState<WorkSeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionTx, setActionTx] = useState<{ seal_id: string; hash?: string; status: string; error?: string } | null>(null);

  function load() {
    if (!address) return;
    setLoading(true);
    getSealsByContributor(address)
      .then(setSeals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [address]);

  async function handleAccept(seal: WorkSeal) {
    setActionTx({ seal_id: seal.seal_id, status: "pending" });
    try {
      const bondValue = seal.bond_required ? genToWei(weiToGen(seal.bond_amount)) : 0n;
      const hash = await acceptSeal(seal.seal_id, bondValue);
      setActionTx({ seal_id: seal.seal_id, hash, status: "waiting" });
      await waitForTxFinality(hash as `0x${string}`);
      setActionTx({ seal_id: seal.seal_id, hash, status: "done" });
      load();
    } catch (e) {
      setActionTx({ seal_id: seal.seal_id, status: "error", error: e instanceof Error ? e.message : "Failed" });
    }
  }

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Briefcase className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <p className="text-[#475569] text-sm">Connect your wallet to view your contributor dashboard.</p>
      </div>
    );
  }

  const grouped = {
    invited: seals.filter((s) => s.status === "funded"),
    active: seals.filter((s) => ["accepted", "delivery_submitted", "under_review", "revision_requested"].includes(s.status)),
    settled: seals.filter((s) => ["accepted_full", "accepted_partial", "rejected"].includes(s.status)),
    closed: seals.filter((s) => ["cancelled", "expired"].includes(s.status)),
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Contributor Dashboard</h1>
        <p className="text-xs text-[#475569] font-mono">{address}</p>
      </div>

      {loading && <div className="text-[#475569] text-sm py-8 text-center">Loading…</div>}
      {error && <div className="text-[#EF4444] text-sm py-4 bg-[#1a0000]/50 border border-[#EF4444]/20 rounded-xl text-center">{error}</div>}

      {/* Invited / fundable seals */}
      {grouped.invited.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Invited — Awaiting Acceptance ({grouped.invited.length})</h2>
          <div className="space-y-3">
            {grouped.invited.map((seal) => (
              <div key={seal.seal_id} className="bg-[#0F172A] border border-[#E0B64B]/20 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[#F8FAFC] font-semibold">{seal.title}</div>
                    <div className="text-[10px] text-[#475569] mt-0.5">Seal #{seal.seal_id}</div>
                  </div>
                  <span className="text-[#E0B64B] font-mono text-sm font-bold">{weiToGen(seal.total_escrow)} GEN</span>
                </div>

                {seal.bond_required && (
                  <div className="mb-3 text-xs text-[#F59E0B] bg-[#1a1000]/60 border border-[#F59E0B]/20 rounded-lg px-3 py-2">
                    Bond required: {weiToGen(seal.bond_amount)} GEN (returned on valid delivery)
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Link href={`/seal/${seal.seal_id}`}
                    className="text-xs text-[#CBD5E1] border border-[#1e293b] rounded-lg px-3 py-1.5 hover:bg-[#0a0f1a] transition-all">
                    View Details
                  </Link>
                  {!isDeadlinePassed(seal.deadline) && (
                    <button
                      onClick={() => handleAccept(seal)}
                      disabled={actionTx?.seal_id === seal.seal_id && ["pending", "waiting"].includes(actionTx.status)}
                      className="text-xs text-[#07080C] bg-[#E0B64B] rounded-lg px-3 py-1.5 font-bold hover:bg-[#f0c85b] transition-all disabled:opacity-50"
                    >
                      {actionTx?.seal_id === seal.seal_id && actionTx.status === "waiting" ? "Waiting…" :
                       actionTx?.seal_id === seal.seal_id && actionTx.status === "pending" ? "Sending…" :
                       "Accept Seal"}
                    </button>
                  )}
                </div>

                {actionTx?.seal_id === seal.seal_id && actionTx.hash && (
                  <div className="mt-2"><TxLink hash={actionTx.hash} /></div>
                )}
                {actionTx?.seal_id === seal.seal_id && actionTx.status === "error" && (
                  <div className="mt-2 text-xs text-[#EF4444]">{actionTx.error}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active work */}
      {grouped.active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Active Work ({grouped.active.length})</h2>
          <div className="space-y-3">
            {grouped.active.map((seal) => (
              <div key={seal.seal_id} className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[#F8FAFC] font-semibold">{seal.title}</div>
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
                <Link href={`/work/${seal.seal_id}`}
                  className="text-xs text-[#22D3EE] border border-[#22D3EE]/30 rounded-lg px-3 py-1.5 hover:bg-[#001a1f] transition-all">
                  Open Work Room
                </Link>
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
                  Payout: <span className={`font-mono ${BigInt(seal.payout_amount) > 0n ? "text-[#16A34A]" : "text-[#475569]"}`}>{weiToGen(seal.payout_amount)} GEN</span>
                </div>
                {!seal.payout_claimed && BigInt(seal.payout_amount) > 0n && (
                  <Link href="/claims" className="mt-2 inline-block text-[11px] text-[#E0B64B] hover:underline">
                    Claim payout →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && seals.length === 0 && (
        <div className="text-center py-16 text-[#475569] text-sm">
          No seals assigned to your wallet yet.{" "}
          <Link href="/explore" className="text-[#E0B64B] hover:underline">Explore open seals.</Link>
        </div>
      )}
    </div>
  );
}
