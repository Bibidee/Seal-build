"use client";

import { useEffect, useState } from "react";
import { Eye, TrendingUp, TrendingDown, Clock, AlertCircle, Shield, ExternalLink } from "lucide-react";
import { getAdminStats, weiToGen, explorerAddress } from "@/lib/genlayer/sealClient";
import type { AdminStats } from "@/lib/genlayer/types";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ label, value, sub, color = "#CBD5E1" }: StatCardProps) {
  return (
    <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-2">{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[#334155] mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminMonitorPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  useEffect(() => {
    if (!contractAddress) {
      setError("Contract not deployed — set NEXT_PUBLIC_CONTRACT_ADDRESS");
      setLoading(false);
      return;
    }
    getAdminStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-5 h-5 text-[#475569]" />
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Admin Observatory</h1>
        </div>
        <p className="text-xs text-[#475569]">Read-only protocol monitor. No admin controls. No override capability.</p>
        {contractAddress && (
          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-[#334155]">
            Contract:
            <a
              href={explorerAddress(contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#22D3EE] hover:underline flex items-center gap-1"
            >
              {contractAddress.slice(0, 8)}…{contractAddress.slice(-6)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Read-only notice */}
      <div className="mb-6 flex items-start gap-2.5 bg-[#0d1829] border border-[#1a2540] rounded-xl p-3">
        <Shield className="w-4 h-4 text-[#475569] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#475569]">
          This page displays aggregate protocol statistics only. Admin cannot approve, reject, release,
          refund, slash, edit criteria, view private drafts, or impersonate users. All settlements
          are decided by GenLayer validators against criteria defined by buyers.
        </p>
      </div>

      {loading && <div className="text-center py-12 text-[#475569] text-sm">Loading protocol stats…</div>}
      {error && (
        <div className="text-center py-12 text-[#EF4444] text-sm bg-[#1a0000]/50 border border-[#EF4444]/20 rounded-xl">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Money strip */}
          <section className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">GEN Settlement Strip</div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total GEN Escrowed" value={weiToGen(stats.total_escrowed_wei)} sub="All-time locked" color="#E0B64B" />
              <StatCard label="Total GEN Released" value={weiToGen(stats.total_released_wei)} sub="To contributors" color="#16A34A" />
              <StatCard label="Total GEN Refunded" value={weiToGen(stats.total_refunded_wei)} sub="To buyers" color="#22D3EE" />
            </div>
          </section>

          {/* Seal counts */}
          <section className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">Seal Counts</div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
              <StatCard label="Total Seals" value={stats.total_seals} color="#F8FAFC" />
              <StatCard label="Funded" value={stats.funded} color="#E0B64B" />
              <StatCard label="Accepted" value={stats.accepted} color="#22D3EE" />
              <StatCard label="Under Review" value={stats.under_review} color="#7C3AED" />
              <StatCard label="Revision Pending" value={stats.revision_requested} color="#F59E0B" />
              <StatCard label="Accepted Full" value={stats.accepted_full} color="#16A34A" />
              <StatCard label="Accepted Partial" value={stats.accepted_partial} color="#22D3EE" />
              <StatCard label="Rejected" value={stats.rejected} color="#EF4444" />
            </div>
          </section>

          {/* Pending / stuck */}
          <section className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">Pending Verdicts & Stuck Claims</div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-[#0F172A] border rounded-xl p-5 ${stats.pending_verdicts > 0 ? "border-[#7C3AED]/40" : "border-[#1e293b]"}`}>
                <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-2">Pending Verdicts</div>
                <div className={`text-3xl font-bold font-mono ${stats.pending_verdicts > 0 ? "text-[#7C3AED]" : "text-[#334155]"}`}>
                  {stats.pending_verdicts}
                </div>
                {stats.pending_verdicts > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#7C3AED]">
                    <Clock className="w-3 h-3 animate-pulse" />
                    Awaiting GenLayer consensus
                  </div>
                )}
              </div>
              <div className={`bg-[#0F172A] border rounded-xl p-5 ${stats.stuck_claims > 0 ? "border-[#F59E0B]/40" : "border-[#1e293b]"}`}>
                <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-2">Stuck Claims</div>
                <div className={`text-3xl font-bold font-mono ${stats.stuck_claims > 0 ? "text-[#F59E0B]" : "text-[#334155]"}`}>
                  {stats.stuck_claims}
                </div>
                {stats.stuck_claims > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#F59E0B]">
                    <AlertCircle className="w-3 h-3" />
                    Verdicts settled but GEN unclaimed
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Status breakdown */}
          <section className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">Status Breakdown</div>
            <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4">
              {[
                { label: "Cancelled", val: stats.cancelled, color: "#64748B" },
                { label: "Expired",   val: stats.expired,   color: "#64748B" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#1e293b] last:border-0">
                  <span className="text-sm text-[#475569]">{label}</span>
                  <span className="font-mono text-sm font-semibold" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Deployment */}
          <section>
            <div className="text-[10px] uppercase tracking-widest text-[#475569] mb-3">Deployment Info</div>
            <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Network</span>
                <span className="text-[#CBD5E1]">StudioNet (Chain 61999)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">RPC</span>
                <span className="text-[#CBD5E1]">https://studio.genlayer.com/api</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Contract Version</span>
                <span className="text-[#CBD5E1]">{stats.contract_version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Contract Address</span>
                {contractAddress ? (
                  <a href={explorerAddress(contractAddress)} target="_blank" rel="noopener noreferrer"
                    className="text-[#22D3EE] hover:underline flex items-center gap-1">
                    {contractAddress}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="text-[#EF4444]">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Explorer</span>
                <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noopener noreferrer"
                  className="text-[#22D3EE] hover:underline">
                  explorer-studio.genlayer.com
                </a>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
