"use client";

import { useEffect, useState } from "react";
import { Coins, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import {
  getSealsByBuyer, getSealsByContributor,
  claimContributorPayout, claimBuyerRefund, withdrawContributorBond,
  weiToGen, shortAddr, statusLabel, statusColor, explorerTx,
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

export default function ClaimsPage() {
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

      // Buyer: refunds
      for (const s of buyerSeals) {
        if (BigInt(s.refund_amount) > 0n) {
          items.push({
            seal_id: s.seal_id,
            title: s.title,
            type: "refund",
            amount: s.refund_amount,
            claimed: s.refund_claimed,
            status: s.status,
          });
        }
      }

      // Contributor: payouts + bonds
      for (const s of contribSeals) {
        if (BigInt(s.payout_amount) > 0n) {
          items.push({
            seal_id: s.seal_id,
            title: s.title,
            type: "payout",
            amount: s.payout_amount,
            claimed: s.payout_claimed,
            status: s.status,
          });
        }
        if (BigInt(s.bond_locked || "0") > 0n && !s.bond_claimed) {
          const bondReturnable = ["accepted_full", "accepted_partial", "rejected", "cancelled", "expired"].includes(s.status)
            || s.bond_action === "return";
          if (bondReturnable) {
            items.push({
              seal_id: s.seal_id,
              title: s.title,
              type: "bond",
              amount: s.bond_locked || "0",
              claimed: s.bond_claimed,
              status: s.status,
            });
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
      if (item.type === "payout") hash = await claimContributorPayout(item.seal_id);
      else if (item.type === "refund") hash = await claimBuyerRefund(item.seal_id);
      else hash = await withdrawContributorBond(item.seal_id);

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
        <Coins className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <p className="text-[#475569] text-sm">Connect your wallet to view your claims.</p>
      </div>
    );
  }

  const unclaimed = claims.filter((c) => !c.claimed);
  const claimed = claims.filter((c) => c.claimed);

  const typeConfig = {
    payout: { label: "Contributor Payout", color: "#16A34A", bg: "bg-[#001a08]/60 border-[#16A34A]/30" },
    refund: { label: "Buyer Refund", color: "#22D3EE", bg: "bg-[#001a1f]/60 border-[#22D3EE]/30" },
    bond:   { label: "Bond Return", color: "#E0B64B", bg: "bg-[#1a1200]/60 border-[#E0B64B]/30" },
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Claim Center</h1>
        <p className="text-[#475569] text-sm">Claim your GEN payouts, refunds, and bond returns.</p>
      </div>

      {loading && <div className="text-[#475569] text-sm py-8 text-center">Loading claims…</div>}

      {!loading && unclaimed.length === 0 && claimed.length === 0 && (
        <div className="text-center py-16 text-[#475569] text-sm">
          No claims found for your wallet.
        </div>
      )}

      {unclaimed.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Ready to Claim ({unclaimed.length})</h2>
          <div className="space-y-3">
            {unclaimed.map((item) => {
              const key = `${item.seal_id}:${item.type}`;
              const tx = txStates[key];
              const cfg = typeConfig[item.type];
              return (
                <div key={key} className={`rounded-xl border p-5 ${cfg.bg}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-xs text-[#475569] uppercase tracking-wider mb-0.5">{cfg.label}</div>
                      <div className="text-sm text-[#F8FAFC] font-semibold">{item.title}</div>
                      <div className="text-[10px] text-[#475569] font-mono mt-0.5">Seal #{item.seal_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg" style={{ color: cfg.color }}>
                        {weiToGen(item.amount)}
                      </div>
                      <div className="text-[10px] text-[#475569]">GEN</div>
                    </div>
                  </div>

                  {tx?.status === "error" && (
                    <div className="mb-3 text-xs text-[#EF4444]">{tx.error}</div>
                  )}
                  {tx?.hash && (
                    <div className="mb-3"><TxLink hash={tx.hash} /></div>
                  )}
                  {tx?.status === "done" ? (
                    <div className="flex items-center gap-2 text-xs text-[#16A34A]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Claimed successfully
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaim(item)}
                      disabled={tx?.status === "pending" || tx?.status === "waiting"}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                      style={{ background: cfg.color, color: "#07080C" }}
                    >
                      <Coins className="w-4 h-4" />
                      {tx?.status === "pending" ? "Sending…" :
                       tx?.status === "waiting" ? "Waiting for consensus…" :
                       `Claim ${weiToGen(item.amount)} GEN`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {claimed.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[#475569] mb-4">Claimed ({claimed.length})</h2>
          <div className="space-y-2">
            {claimed.map((item) => {
              const key = `${item.seal_id}:${item.type}`;
              const cfg = typeConfig[item.type];
              const tx = txStates[key];
              return (
                <div key={key} className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#475569] uppercase tracking-wider">{cfg.label}</div>
                    <div className="text-sm text-[#64748B]">{item.title} · Seal #{item.seal_id}</div>
                    {tx?.hash && <TxLink hash={tx.hash} label="Explorer" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm" style={{ color: cfg.color }}>{weiToGen(item.amount)} GEN</span>
                    <CheckCircle className="w-4 h-4 text-[#16A34A]" />
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
