"use client";

import { useEffect, useState } from "react";
import { Vault, CheckCircle } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSealsByBuyer, getSealsByContributor,
  claimContributorPayout, claimBuyerRefund, withdrawContributorBond,
  weiToGen,
} from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { TxLink } from "@/components/ui/TxLink";
import type { WorkSeal } from "@/lib/genlayer/types";

interface ClaimItem {
  seal_id: string;
  title: string;
  type: "payout" | "refund" | "bond";
  amount: string;
  claimed: boolean;
  status: string;
}

const TYPE_CONFIG = {
  payout: { label: "CONTRIBUTOR PAYOUT", accentColor: "#00E87A", stampClass: "stamp-accept",  borderColor: "#00E87A40", bg: "#001F0F" },
  refund: { label: "BUYER REFUND",        accentColor: "#FF5C1A", stampClass: "stamp-refund",  borderColor: "#FF5C1A40", bg: "#251200" },
  bond:   { label: "BOND RETURN",         accentColor: "#00C9E8", stampClass: "stamp-partial", borderColor: "#00C9E840", bg: "#001E28" },
};

export default function ClaimGatePage() {
  const { address } = useWallet();
  const [claims, setClaims] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [txStates, setTxStates] = useState<Record<string, { status: string; hash?: string; error?: string }>>({});

  async function load() {
    if (!address) return;
    setLoading(true);
    try {
      const [buyerSeals, contribSeals] = await Promise.all([
        getSealsByBuyer(address),
        getSealsByContributor(address),
      ]);

      const items: ClaimItem[] = [];

      for (const s of buyerSeals) {
        if (BigInt(s.refund_amount) > 0n) {
          items.push({ seal_id: s.seal_id, title: s.title, type: "refund", amount: s.refund_amount, claimed: s.refund_claimed, status: s.status });
        }
      }

      for (const s of contribSeals) {
        if (BigInt(s.payout_amount) > 0n) {
          items.push({ seal_id: s.seal_id, title: s.title, type: "payout", amount: s.payout_amount, claimed: s.payout_claimed, status: s.status });
        }
        if (BigInt(s.bond_locked || "0") > 0n && !s.bond_claimed) {
          const bondReturnable = ["accepted_full", "accepted_partial", "rejected", "cancelled", "expired"].includes(s.status) || s.bond_action === "return";
          if (bondReturnable) {
            items.push({ seal_id: s.seal_id, title: s.title, type: "bond", amount: s.bond_locked || "0", claimed: s.bond_claimed, status: s.status });
          }
        }
      }

      setClaims(items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [address]);

  async function handleClaim(item: ClaimItem) {
    const key = `${item.seal_id}:${item.type}`;
    setTxStates((s) => ({ ...s, [key]: { status: "pending" } }));
    try {
      let hash: string;
      if (item.type === "payout")      hash = await claimContributorPayout(item.seal_id);
      else if (item.type === "refund") hash = await claimBuyerRefund(item.seal_id);
      else                              hash = await withdrawContributorBond(item.seal_id);
      setTxStates((s) => ({ ...s, [key]: { status: "waiting", hash } }));
      await waitForTxFinality(hash as `0x${string}`);
      setTxStates((s) => ({ ...s, [key]: { status: "done", hash } }));
      load();
    } catch (e) {
      setTxStates((s) => ({ ...s, [key]: { status: "error", error: e instanceof Error ? e.message : "Failed" } }));
    }
  }

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Vault className="w-8 h-8 text-[#2A3A50] mx-auto mb-4" />
        <p className="text-[#5C7090] text-sm">Connect your wallet to access the Claim Gate.</p>
      </div>
    );
  }

  const unclaimed = claims.filter((c) => !c.claimed);
  const claimed   = claims.filter((c) => c.claimed);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Vault className="w-4 h-4 text-[#00C9E8]" />
          <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>CLAIM GATE</h1>
        </div>
        <p className="manifest-label">CLAIM GEN PAYOUTS · REFUNDS · BOND RETURNS</p>
      </div>

      {loading && <div className="manifest-label py-8 text-center">LOADING CLAIMS…</div>}

      {!loading && unclaimed.length === 0 && claimed.length === 0 && (
        <div className="text-center py-16 text-[#5C7090] text-sm">No claims found for your wallet.</div>
      )}

      {/* Unclaimed */}
      {unclaimed.length > 0 && (
        <section className="mb-8">
          <div className="manifest-label mb-3">READY TO CLAIM ({unclaimed.length})</div>
          <div className="space-y-3">
            {unclaimed.map((item) => {
              const key = `${item.seal_id}:${item.type}`;
              const tx  = txStates[key];
              const cfg = TYPE_CONFIG[item.type];
              return (
                <div key={key} className="border p-5" style={{ borderColor: cfg.borderColor, background: cfg.bg, borderLeftColor: cfg.accentColor, borderLeftWidth: 3 }}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className={`stamp text-[9px] ${cfg.stampClass} mb-2 inline-flex`}>{cfg.label}</span>
                      <div className="text-sm text-[#E8EDF5] font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>
                        {item.title}
                      </div>
                      <div className="manifest-label mt-0.5">CASE #{String(item.seal_id).padStart(4, "0")}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono" style={{ color: cfg.accentColor, fontFamily: "var(--font-display)" }}>
                        {weiToGen(item.amount)}
                      </div>
                      <div className="manifest-label">GEN</div>
                    </div>
                  </div>

                  {tx?.status === "error" && (
                    <div className="mb-3 font-mono text-[11px] text-[#FF2D4A]">{tx.error}</div>
                  )}
                  {tx?.hash && <div className="mb-3"><TxLink hash={tx.hash} /></div>}

                  {tx?.status === "done" ? (
                    <div className="flex items-center gap-2 manifest-label text-[#00E87A]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      CLAIMED SUCCESSFULLY
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaim(item)}
                      disabled={tx?.status === "pending" || tx?.status === "waiting"}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 font-bold tracking-widest transition-all disabled:opacity-50 text-[#080B10] text-[11px]"
                      style={{ background: cfg.accentColor, fontFamily: "var(--font-display)" }}
                    >
                      <Vault className="w-3.5 h-3.5" />
                      {tx?.status === "pending" ? "SENDING…" :
                       tx?.status === "waiting" ? "WAITING FOR CONSENSUS…" :
                       `CLAIM ${weiToGen(item.amount)} GEN`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Claimed */}
      {claimed.length > 0 && (
        <section>
          <div className="manifest-label mb-3">CLAIMED ({claimed.length})</div>
          <div className="space-y-2">
            {claimed.map((item) => {
              const key = `${item.seal_id}:${item.type}`;
              const cfg = TYPE_CONFIG[item.type];
              const tx  = txStates[key];
              return (
                <div key={key} className="dock-panel p-3.5 flex items-center justify-between">
                  <div>
                    <div className="manifest-label mb-0.5">{cfg.label}</div>
                    <div className="text-sm text-[#5C7090]">{item.title} · CASE #{String(item.seal_id).padStart(4, "0")}</div>
                    {tx?.hash && <div className="mt-1"><TxLink hash={tx.hash} label="CHAIN RECEIPT" /></div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm" style={{ color: cfg.accentColor }}>{weiToGen(item.amount)} GEN</span>
                    <CheckCircle className="w-4 h-4 text-[#00E87A]" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
