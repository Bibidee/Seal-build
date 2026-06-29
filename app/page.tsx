"use client";

import Link from "next/link";
import { Shield, Zap, Lock, Scale, ArrowRight, CheckCircle, Globe, Bot, Bug, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminStats } from "@/lib/genlayer/sealClient";
import type { AdminStats } from "@/lib/genlayer/types";
import { weiToGen } from "@/lib/genlayer/sealClient";

const FLOW_STEPS = [
  { n: "01", color: "#E0B64B", title: "Fund Escrow",       desc: "Buyer deposits GEN into a locked Work Seal with defined acceptance criteria." },
  { n: "02", color: "#22D3EE", title: "Accept & Bond",     desc: "Contributor accepts the seal. Optionally locks a bond to signal commitment." },
  { n: "03", color: "#7C3AED", title: "Submit Evidence",   desc: "Contributor delivers a packet: summary, evidence URLs, and completion notes." },
  { n: "04", color: "#16A34A", title: "GenLayer Judges",   desc: "Validators reach consensus on whether the deliverable meets the criteria." },
  { n: "05", color: "#E0B64B", title: "Settlement",        desc: "GEN flows: full release, partial split, revision loop, or buyer refund." },
];

const USE_CASES = [
  { icon: Globe,    title: "DAO Bounties",      desc: "DAOs fund contributor tasks with locked GEN. No central judge. Just criteria and evidence." },
  { icon: Zap,      title: "Hackathon Prizes",  desc: "Sponsors fund integrations. Builders demo. GenLayer decides if the demo satisfies scope." },
  { icon: Bot,      title: "AI Agent Work",     desc: "Users hire agents for structured tasks. Completeness is judged against a spec." },
  { icon: FileText, title: "Content Campaigns", desc: "Projects pay for articles, threads, explainers — judged against brief and quality bar." },
  { icon: Bug,      title: "Bug Fix Acceptance",desc: "Clients fund bug fixes. Contributor submits PR and reproduction evidence." },
];

export default function LandingPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (addr) {
      getAdminStats().then(setStats).catch(() => {});
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <section className="pt-16 pb-20 text-center relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-5 bg-[#E0B64B]" />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-[#E0B64B]/10 border border-[#E0B64B]/30 rounded-full px-4 py-1.5 text-xs text-[#E0B64B] font-mono uppercase tracking-widest mb-8">
            <Shield className="w-3 h-3" />
            GenLayer Intelligent Contract · StudioNet
          </div>

          <h1 className="text-5xl font-bold text-[#F8FAFC] mb-5 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
            Work is not done until<br />
            <span className="text-[#E0B64B]">the seal breaks clean.</span>
          </h1>

          <p className="text-[#64748B] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Fund work in GEN, define acceptance criteria, receive delivery evidence, and let
            GenLayer judge whether payment should be released, revised, split, or refunded.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-[#E0B64B] text-[#07080C] px-6 py-3 rounded-xl font-bold hover:bg-[#f0c85b] transition-all text-sm"
            >
              <Shield className="w-4 h-4" />
              Create Work Seal
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 bg-[#0F172A] text-[#CBD5E1] border border-[#1e293b] px-6 py-3 rounded-xl font-semibold hover:border-[#E0B64B]/40 transition-all text-sm"
            >
              Explore Public Seals
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live stats */}
      {stats && (
        <section className="mb-16">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-[#E0B64B] font-mono">{stats.total_seals}</div>
              <div className="text-xs text-[#475569] mt-1 uppercase tracking-wider">Total Seals</div>
            </div>
            <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-[#16A34A] font-mono">{weiToGen(stats.total_released_wei)}</div>
              <div className="text-xs text-[#475569] mt-1 uppercase tracking-wider">GEN Released</div>
            </div>
            <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-[#22D3EE] font-mono">{weiToGen(stats.total_escrowed_wei)}</div>
              <div className="text-xs text-[#475569] mt-1 uppercase tracking-wider">GEN Escrowed</div>
            </div>
          </div>
        </section>
      )}

      {/* Why normal escrow fails */}
      <section className="mb-16">
        <div className="bg-[#0F172A] border border-[#1e293b] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#F8FAFC] mb-4">Why normal escrow fails</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Did the deliverable match the spec?",
              "Was the work complete or superficially done?",
              "Is partial payment appropriate?",
              "Is the client rejecting unfairly?",
              "Was the evidence sufficient?",
              "Should the contributor get revised scope?",
            ].map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-[#475569]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
                {q}
              </div>
            ))}
          </div>
          <p className="text-[#64748B] text-sm mt-4 pt-4 border-t border-[#1e293b]">
            Traditional escrow only checks deposits and clicks. Seal routes every acceptance question through
            GenLayer validator consensus — the protocol that can actually read and judge evidence.
          </p>
        </div>
      </section>

      {/* Escrow-to-verdict flow */}
      <section className="mb-16">
        <h2 className="text-lg font-bold text-[#F8FAFC] mb-6">Escrow → Evidence → Verdict → Settlement</h2>
        <div className="space-y-3">
          {FLOW_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-[#0F172A] border border-[#1e293b] rounded-xl p-4 hover:border-opacity-60 transition-all" style={{ "--hover-color": step.color } as React.CSSProperties}>
              <div className="text-xs font-mono font-bold flex-shrink-0 mt-0.5" style={{ color: step.color }}>{step.n}</div>
              <div>
                <div className="text-sm font-semibold text-[#F8FAFC] mb-1" style={{ color: step.color }}>{step.title}</div>
                <div className="text-sm text-[#475569]">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="mb-16">
        <h2 className="text-lg font-bold text-[#F8FAFC] mb-6">Built for every funded work order</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((uc, i) => (
            <div key={i} className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4 hover:border-[#E0B64B]/30 transition-all">
              <div className="w-8 h-8 rounded-lg bg-[#E0B64B]/10 border border-[#E0B64B]/20 flex items-center justify-center mb-3">
                <uc.icon className="w-4 h-4 text-[#E0B64B]" />
              </div>
              <h3 className="text-sm font-semibold text-[#F8FAFC] mb-1">{uc.title}</h3>
              <p className="text-xs text-[#475569] leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mb-12">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#07080C] border border-[#E0B64B]/20 rounded-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-5 bg-[#E0B64B] translate-x-1/3 -translate-y-1/3" />
          </div>
          <div className="relative">
            <Lock className="w-8 h-8 text-[#E0B64B] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#F8FAFC] mb-3">Lock in your next work order</h2>
            <p className="text-[#64748B] text-sm mb-6 max-w-md mx-auto">
              No admin override. No off-chain approval. Every acceptance is decided by GenLayer validators
              against criteria you define before work starts.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-[#E0B64B] text-[#07080C] px-8 py-3 rounded-xl font-bold hover:bg-[#f0c85b] transition-all"
            >
              <Shield className="w-4 h-4" />
              Create Work Seal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
