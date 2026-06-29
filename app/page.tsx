"use client";

import Link from "next/link";
import { Anchor, Zap, Lock, ArrowRight, CheckCircle, Globe, Bot, Bug, FileText, Shield, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminStats, weiToGen } from "@/lib/genlayer/sealClient";
import type { AdminStats } from "@/lib/genlayer/types";

const FLOW_STEPS = [
  { n: "01", accent: "#00C9E8", label: "FUND ESCROW",       desc: "Buyer deposits GEN into a locked Work Seal with defined acceptance criteria." },
  { n: "02", accent: "#F5C000", label: "ACCEPT & BOND",     desc: "Contributor accepts the seal. Optionally locks a bond to signal delivery commitment." },
  { n: "03", accent: "#FF5C1A", label: "SUBMIT EVIDENCE",   desc: "Contributor delivers a packet: summary, evidence URLs, completion notes." },
  { n: "04", accent: "#A78BFA", label: "GENLAYER JUDGES",   desc: "Validators reach consensus on whether the deliverable meets acceptance criteria." },
  { n: "05", accent: "#00E87A", label: "SETTLEMENT",        desc: "GEN flows: full release, partial split, revision loop, or buyer refund." },
];

const USE_CASES = [
  { icon: Globe,    accent: "#00C9E8", title: "DAO Bounties",      desc: "DAOs fund contributor tasks with locked GEN. No central judge." },
  { icon: Zap,      accent: "#F5C000", title: "Hackathon Prizes",  desc: "Sponsors fund integrations. Builders demo. GenLayer decides if the demo satisfies scope." },
  { icon: Bot,      accent: "#00E87A", title: "AI Agent Work",     desc: "Users hire agents for structured tasks. Completeness is judged against a spec." },
  { icon: FileText, accent: "#FF5C1A", title: "Content Campaigns", desc: "Projects pay for articles, threads, explainers — judged against brief and quality bar." },
  { icon: Bug,      accent: "#A78BFA", title: "Bug Fix Acceptance",desc: "Clients fund bug fixes. Contributor submits PR and reproduction evidence." },
];

const FAILURE_QUESTIONS = [
  "Did the deliverable match the spec?",
  "Was the work complete or superficially done?",
  "Is partial payment appropriate?",
  "Is the client rejecting unfairly?",
  "Was the evidence sufficient?",
  "Should the contributor get revised scope?",
];

export default function DockPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
      getAdminStats().then(setStats).catch(() => {});
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Hero: Inspection Dock ── */}
      <section className="pt-12 pb-14 relative">
        {/* Dock grid lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30"
          style={{ backgroundImage: "linear-gradient(#182030 1px, transparent 1px), linear-gradient(90deg, #182030 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 border border-[#00C9E8]/30 bg-[#001E28] px-4 py-1.5 font-mono text-[11px] text-[#00C9E8] uppercase tracking-widest mb-8">
            <Anchor className="w-3 h-3" />
            GenLayer Intelligent Contract · StudioNet · Chain 61999
          </div>

          <h1 className="text-6xl font-bold text-[#E8EDF5] mb-4 leading-tight"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
            WORK IS NOT DONE<br />
            <span className="text-[#00C9E8]">UNTIL THE SEAL BREAKS CLEAN.</span>
          </h1>

          <p className="text-[#5C7090] text-base max-w-2xl mb-10 leading-relaxed">
            Fund work in GEN, define acceptance criteria, receive delivery evidence,
            and let GenLayer validators judge whether payment should be released, revised, split, or refunded.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-[#00C9E8] text-[#080B10] px-6 py-3 text-sm font-bold tracking-widest hover:bg-[#00DFFE] transition-all"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <Lock className="w-4 h-4" />
              OPEN A WORK SEAL
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 bg-transparent text-[#A0B4C8] border border-[#182030] px-6 py-3 text-sm font-semibold hover:border-[#00C9E8]/40 hover:text-[#00C9E8] transition-all"
            >
              Browse Cases
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live Protocol Stats ── */}
      {stats && (
        <section className="mb-14">
          <div className="manifest-label mb-3">PROTOCOL TELEMETRY · LIVE</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "TOTAL SEALS", value: stats.total_seals, color: "#E8EDF5" },
              { label: "GEN RELEASED", value: weiToGen(stats.total_released_wei), color: "#00E87A" },
              { label: "GEN ESCROWED", value: weiToGen(stats.total_escrowed_wei), color: "#00C9E8" },
            ].map((s) => (
              <div key={s.label} className="dock-panel p-5 text-center border-t-2" style={{ borderTopColor: s.color }}>
                <div className="text-2xl font-bold font-mono mb-1" style={{ color: s.color, fontFamily: "var(--font-display)" }}>
                  {s.value}
                </div>
                <div className="manifest-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Dock layout: Manifest | Flow | Gate ── */}
      <section className="mb-14 grid lg:grid-cols-3 gap-6">

        {/* Left: Why escrow fails */}
        <div className="dock-panel border-l-2 border-l-[#FF2D4A]">
          <div className="px-4 py-3 border-b border-[#182030] flex items-center gap-2">
            <TriangleAlert className="w-3.5 h-3.5 text-[#FF2D4A]" />
            <span className="manifest-label text-[#FF2D4A]">WHY NORMAL ESCROW FAILS</span>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {FAILURE_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-[#5C7090]">
                <div className="w-1 h-1 rounded-full bg-[#FF2D4A] flex-shrink-0 mt-2" />
                {q}
              </div>
            ))}
          </div>
          <div className="px-4 pb-4 pt-2 border-t border-[#182030]">
            <p className="text-[11px] text-[#2A3A50] leading-relaxed">
              Traditional escrow only checks deposits and clicks. Seal routes every acceptance question
              through GenLayer validator consensus.
            </p>
          </div>
        </div>

        {/* Centre: Acceptance flow */}
        <div className="dock-panel">
          <div className="px-4 py-3 border-b border-[#182030]">
            <span className="manifest-label">ESCROW → EVIDENCE → VERDICT → SETTLEMENT</span>
          </div>
          <div className="p-4 space-y-3">
            {FLOW_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-[#182030] pb-3 last:border-0 last:pb-0">
                <span className="font-mono font-bold text-sm flex-shrink-0 mt-0.5" style={{ color: step.accent }}>{step.n}</span>
                <div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: step.accent, fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}>
                    {step.label}
                  </div>
                  <div className="text-[11px] text-[#5C7090] leading-relaxed">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Verdict outcomes */}
        <div className="dock-panel">
          <div className="px-4 py-3 border-b border-[#182030]">
            <span className="manifest-label">VERDICT OUTCOMES</span>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { stampClass: "stamp-accept",   label: "FULL PAYMENT",    desc: "Meets all criteria — full GEN released to contributor." },
              { stampClass: "stamp-partial",  label: "SPLIT PAYOUT",    desc: "Partial acceptance — GEN split per verdict." },
              { stampClass: "stamp-revision", label: "REVISION NOTICE", desc: "Work returned for revision loop." },
              { stampClass: "stamp-refund",   label: "RETURN SEAL",     desc: "Buyer refunded — delivery not accepted." },
              { stampClass: "stamp-breach",   label: "BOND SLASHED",    desc: "Fraudulent or severe failure — bond slashed." },
            ].map((v) => (
              <div key={v.label} className="flex items-start gap-3">
                <span className={`stamp text-[9px] flex-shrink-0 mt-0.5 ${v.stampClass}`}>{v.label}</span>
                <span className="text-[11px] text-[#5C7090] leading-relaxed">{v.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="mb-14">
        <div className="manifest-label mb-4">USE CASES — BUILT FOR EVERY FUNDED WORK ORDER</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {USE_CASES.map((uc, i) => (
            <div key={i} className="dock-panel p-4 hover:border-[#00C9E8]/30 transition-all"
              style={{ borderTopColor: uc.accent, borderTopWidth: 1 }}>
              <div className="w-7 h-7 border border-[#182030] flex items-center justify-center mb-3"
                style={{ background: `${uc.accent}10` }}>
                <uc.icon className="w-3.5 h-3.5" style={{ color: uc.accent }} />
              </div>
              <div className="text-sm font-bold mb-1 text-[#E8EDF5]"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
                {uc.title.toUpperCase()}
              </div>
              <p className="text-[11px] text-[#5C7090] leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mb-12">
        <div className="border border-[#00C9E8]/20 bg-[#001E28] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00C9E8]" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00C9E8]/20" />
          <Anchor className="w-8 h-8 text-[#00C9E8] mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-[#E8EDF5] mb-2" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
            LOCK IN YOUR NEXT WORK ORDER
          </h2>
          <p className="text-[#5C7090] text-sm mb-6 max-w-md mx-auto">
            No admin override. No off-chain approval. Every acceptance decided by GenLayer validators
            against criteria you define before work starts.
          </p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 bg-[#00C9E8] text-[#080B10] px-8 py-3 font-bold tracking-widest hover:bg-[#00DFFE] transition-all"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Lock className="w-4 h-4" />
            OPEN A WORK SEAL
          </Link>
        </div>
      </section>
    </div>
  );
}
