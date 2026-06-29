"use client";

import { useEffect, useState } from "react";
import { Gauge, Clock, AlertCircle, ExternalLink, Shield } from "lucide-react";
import { getAdminStats, weiToGen, explorerAddress } from "@/lib/genlayer/sealClient";
import type { AdminStats } from "@/lib/genlayer/types";

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
}

function StatTile({ label, value, sub, accentColor = "#5C7090" }: StatTileProps) {
  return (
    <div className="dock-panel p-4" style={{ borderTopColor: accentColor, borderTopWidth: 2 }}>
      <div className="manifest-label mb-2">{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color: accentColor, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
      {sub && <div className="manifest-label mt-1 text-[#2A3A50]">{sub}</div>}
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
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-4 h-4 text-[#00C9E8]" />
          <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>ADMIN MONITOR</h1>
        </div>
        <p className="manifest-label">READ-ONLY PROTOCOL TELEMETRY · NO ADMIN CONTROLS · NO OVERRIDE CAPABILITY</p>
        {contractAddress && (
          <div className="mt-2 flex items-center gap-2">
            <span className="manifest-label">CONTRACT</span>
            <a href={explorerAddress(contractAddress)} target="_blank" rel="noopener noreferrer"
              className="chain-receipt">
              {contractAddress.slice(0, 10)}…{contractAddress.slice(-8)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Read-only disclaimer */}
      <div className="border border-[#182030] bg-[#0C1118] border-l-2 border-l-[#5C7090] px-4 py-3 mb-6 flex items-start gap-3">
        <Shield className="w-4 h-4 text-[#5C7090] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#5C7090] leading-relaxed">
          This page displays aggregate protocol statistics only. Admin cannot approve, reject, release, refund,
          slash, edit criteria, view private drafts, or impersonate users. All settlements are decided by
          GenLayer validators against criteria defined by buyers at seal creation.
        </p>
      </div>

      {loading && <div className="manifest-label text-center py-12">LOADING PROTOCOL STATS…</div>}
      {error && (
        <div className="text-center py-12 font-mono text-[11px] text-[#FF2D4A] border border-[#FF2D4A]/20 bg-[#220010]">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* GEN Strip */}
          <section className="mb-6">
            <div className="manifest-label mb-3">GEN SETTLEMENT STRIP</div>
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="TOTAL GEN ESCROWED" value={weiToGen(stats.total_escrowed_wei)} sub="ALL-TIME LOCKED" accentColor="#00C9E8" />
              <StatTile label="TOTAL GEN RELEASED" value={weiToGen(stats.total_released_wei)} sub="TO CONTRIBUTORS" accentColor="#00E87A" />
              <StatTile label="TOTAL GEN REFUNDED" value={weiToGen(stats.total_refunded_wei)} sub="TO BUYERS"       accentColor="#FF5C1A" />
            </div>
          </section>

          {/* Seal counts */}
          <section className="mb-6">
            <div className="manifest-label mb-3">DELIVERY MANIFEST COUNTS</div>
            <div className="grid grid-cols-4 gap-3">
              <StatTile label="TOTAL SEALS"       value={stats.total_seals}         accentColor="#E8EDF5" />
              <StatTile label="FUNDED"            value={stats.funded}              accentColor="#00C9E8" />
              <StatTile label="ACCEPTED"          value={stats.accepted}            accentColor="#00C9E8" />
              <StatTile label="UNDER REVIEW"      value={stats.under_review}        accentColor="#A78BFA" />
              <StatTile label="REVISION PENDING"  value={stats.revision_requested}  accentColor="#F5C000" />
              <StatTile label="ACCEPTED FULL"     value={stats.accepted_full}       accentColor="#00E87A" />
              <StatTile label="ACCEPTED PARTIAL"  value={stats.accepted_partial}    accentColor="#00C9E8" />
              <StatTile label="REJECTED"          value={stats.rejected}            accentColor="#FF2D4A" />
            </div>
          </section>

          {/* Pending + stuck */}
          <section className="mb-6">
            <div className="manifest-label mb-3">PENDING VERDICTS & STUCK CLAIMS</div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`dock-panel p-5 ${stats.pending_verdicts > 0 ? "border-l-2 border-l-[#A78BFA]" : ""}`}>
                <div className="manifest-label mb-2">PENDING VERDICTS</div>
                <div className={`text-4xl font-bold font-mono ${stats.pending_verdicts > 0 ? "text-[#A78BFA]" : "text-[#2A3A50]"}`}
                  style={{ fontFamily: "var(--font-display)" }}>
                  {stats.pending_verdicts}
                </div>
                {stats.pending_verdicts > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 manifest-label text-[#A78BFA]">
                    <Clock className="w-3 h-3 pulse-cyan" />
                    AWAITING GENLAYER CONSENSUS
                  </div>
                )}
              </div>
              <div className={`dock-panel p-5 ${stats.stuck_claims > 0 ? "border-l-2 border-l-[#F5C000]" : ""}`}>
                <div className="manifest-label mb-2">STUCK CLAIMS</div>
                <div className={`text-4xl font-bold font-mono ${stats.stuck_claims > 0 ? "text-[#F5C000]" : "text-[#2A3A50]"}`}
                  style={{ fontFamily: "var(--font-display)" }}>
                  {stats.stuck_claims}
                </div>
                {stats.stuck_claims > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 manifest-label text-[#F5C000]">
                    <AlertCircle className="w-3 h-3" />
                    VERDICTS SETTLED · GEN UNCLAIMED
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Status breakdown */}
          <section className="mb-6">
            <div className="manifest-label mb-3">STATUS BREAKDOWN</div>
            <div className="dock-panel">
              {[
                { label: "CANCELLED", val: stats.cancelled, color: "#5C7090" },
                { label: "EXPIRED",   val: stats.expired,   color: "#5C7090" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-[#182030] last:border-0">
                  <span className="manifest-label">{label}</span>
                  <span className="font-mono font-semibold" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Deployment info */}
          <section>
            <div className="manifest-label mb-3">DEPLOYMENT MANIFEST</div>
            <div className="dock-panel border-l-2 border-l-[#00C9E8]">
              {[
                { label: "NETWORK",          value: "STUDIONET — CHAIN 61999" },
                { label: "RPC ENDPOINT",     value: "https://studio.genlayer.com/api" },
                { label: "CONTRACT VERSION", value: stats.contract_version },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b border-[#182030] last:border-0">
                  <span className="manifest-label">{label}</span>
                  <span className="font-mono text-[11px] text-[#A0B4C8]">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#182030]">
                <span className="manifest-label">CONTRACT ADDRESS</span>
                {contractAddress ? (
                  <a href={explorerAddress(contractAddress)} target="_blank" rel="noopener noreferrer"
                    className="chain-receipt">
                    {contractAddress}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="font-mono text-[11px] text-[#FF2D4A]">NOT SET</span>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="manifest-label">EXPLORER</span>
                <a href="https://explorer-studio.genlayer.com" target="_blank" rel="noopener noreferrer"
                  className="chain-receipt">
                  explorer-studio.genlayer.com
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
