"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hammer, Clock, TriangleAlert } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSealsByContributor, acceptSeal, genToWei,
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
  return "stamp-partial";
}

export default function ContributorBay() {
  const { address } = useWallet();
  const [seals, setSeals]   = useState<WorkSeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [actionTx, setActionTx] = useState<{
    seal_id: string; hash?: string; status: string; error?: string;
  } | null>(null);

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
        <Hammer className="w-8 h-8 text-[#2A3A50] mx-auto mb-4" />
        <p className="text-[#5C7090] text-sm">Connect your wallet to view the Contributor Bay.</p>
      </div>
    );
  }

  const grouped = {
    invited: seals.filter((s) => s.status === "funded"),
    active:  seals.filter((s) => ["accepted", "delivery_submitted", "under_review", "revision_requested"].includes(s.status)),
    settled: seals.filter((s) => ["accepted_full", "accepted_partial", "rejected"].includes(s.status)),
    closed:  seals.filter((s) => ["cancelled", "expired"].includes(s.status)),
  };

  const btnCls = "text-[10px] font-mono border px-3 py-1.5 transition-all disabled:opacity-50";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Hammer className="w-4 h-4 text-[#FF5C1A]" />
          <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>CONTRIBUTOR BAY</h1>
        </div>
        <p className="manifest-label font-mono">{address}</p>
      </div>

      {loading && <div className="manifest-label py-8 text-center">LOADING ASSIGNED DELIVERIES…</div>}
      {error   && <div className="py-4 text-center font-mono text-[11px] text-[#FF2D4A] border border-[#FF2D4A]/20 bg-[#220010]">{error}</div>}

      {/* Invited — awaiting acceptance */}
      {grouped.invited.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">ASSIGNED DELIVERIES — AWAITING ACCEPTANCE ({grouped.invited.length})</div>
          <div className="space-y-3">
            {grouped.invited.map((seal) => (
              <div key={seal.seal_id} className="dock-panel" style={{ borderLeft: "2px solid #FF5C1A" }}>
                <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#182030]">
                  <div>
                    <div className="manifest-label mb-1">
                      {seal.category || "DELIVERY"} · CASE #{String(seal.seal_id).padStart(4, "0")}
                    </div>
                    <div className="text-[#E8EDF5] font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                      {seal.title}
                    </div>
                  </div>
                  <span className="text-[#00C9E8] font-mono text-sm font-medium">{weiToGen(seal.total_escrow)} GEN</span>
                </div>

                <div className="px-4 py-3">
                  {seal.bond_required && (
                    <div className="flex items-center gap-2 text-[11px] text-[#F5C000] bg-[#211D00] border border-[#F5C000]/20 px-3 py-2 mb-3 font-mono">
                      <TriangleAlert className="w-3 h-3 flex-shrink-0" />
                      BOND REQUIRED: {weiToGen(seal.bond_amount)} GEN — RETURNED ON VALID DELIVERY
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href={`/seal/${seal.seal_id}`}
                      className={`${btnCls} text-[#5C7090] border-[#182030] hover:bg-[#0C1118]`}>
                      VIEW MANIFEST
                    </Link>
                    {!isDeadlinePassed(seal.deadline) && (
                      <button
                        onClick={() => handleAccept(seal)}
                        disabled={actionTx?.seal_id === seal.seal_id && ["pending", "waiting"].includes(actionTx.status)}
                        className={`${btnCls} text-[#080B10] bg-[#FF5C1A] border-[#FF5C1A] hover:bg-[#FF7040]`}
                        style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
                      >
                        {actionTx?.seal_id === seal.seal_id && actionTx.status === "waiting" ? "WAITING…" :
                         actionTx?.seal_id === seal.seal_id && actionTx.status === "pending" ? "SENDING…" :
                         "ACCEPT DELIVERY"}
                      </button>
                    )}
                  </div>
                  {actionTx?.seal_id === seal.seal_id && actionTx.hash && (
                    <div className="mt-2"><TxLink hash={actionTx.hash} /></div>
                  )}
                  {actionTx?.seal_id === seal.seal_id && actionTx.status === "error" && (
                    <div className="mt-2 font-mono text-[11px] text-[#FF2D4A]">{actionTx.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active work */}
      {grouped.active.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">ACTIVE WORK ({grouped.active.length})</div>
          <div className="space-y-3">
            {grouped.active.map((seal) => {
              const passed = isDeadlinePassed(seal.deadline);
              return (
                <div key={seal.seal_id} className="dock-panel" style={{ borderLeft: "2px solid #00C9E8" }}>
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#182030]">
                    <div>
                      <div className="manifest-label mb-1">CASE #{String(seal.seal_id).padStart(4, "0")}</div>
                      <div className="text-[#E8EDF5] font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                        {seal.title}
                      </div>
                    </div>
                    <span className={`stamp text-[9px] ${statusStampClass(seal.status)}`}>
                      {statusLabel(seal.status).toUpperCase()}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-[#00C9E8] font-mono">{weiToGen(seal.total_escrow)} GEN</span>
                      <span className={`flex items-center gap-1 font-mono ${passed ? "text-[#FF2D4A]" : "text-[#5C7090]"}`}>
                        <Clock className="w-3 h-3" />
                        {formatDeadline(seal.deadline)}
                      </span>
                      {seal.status === "revision_requested" && (
                        <span className="stamp text-[9px] stamp-revision">REVISION NOTICE</span>
                      )}
                    </div>
                    <Link href={`/work/${seal.seal_id}`}
                      className={`${btnCls} text-[#00C9E8] border-[#00C9E8]/30 hover:bg-[#001E28]`}>
                      OPEN WORK ROOM
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Settled */}
      {grouped.settled.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">PAYMENT STATUS ({grouped.settled.length})</div>
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
                <div className="text-[11px] font-mono text-[#5C7090] mb-2">
                  PAYOUT <span className={`${BigInt(seal.payout_amount) > 0n ? "text-[#00E87A]" : "text-[#5C7090]"}`}>
                    {weiToGen(seal.payout_amount)} GEN
                  </span>
                </div>
                {!seal.payout_claimed && BigInt(seal.payout_amount) > 0n && (
                  <Link href="/claims" className="manifest-label text-[#00C9E8] hover:underline">CLAIM PAYOUT →</Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && seals.length === 0 && (
        <div className="text-center py-16 text-[#5C7090] text-sm">
          No deliveries assigned to your wallet.{" "}
          <Link href="/explore" className="text-[#00C9E8] hover:underline">Browse open cases.</Link>
        </div>
      )}
    </div>
  );
}
