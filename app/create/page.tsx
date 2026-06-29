"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Plus, Minus, ExternalLink, AlertTriangle } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { createSeal, genToWei, explorerTx } from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { TxLink } from "@/components/ui/TxLink";

const CATEGORIES = ["Development", "Design", "Content", "Research", "AI", "Other"];

export default function CreateSealPage() {
  const router = useRouter();
  const { address } = useWallet();

  const [form, setForm] = useState({
    title: "",
    category: "Development",
    deliverable_description: "",
    acceptance_criteria: "",
    required_evidence: "",
    deadline_date: "",
    revision_limit: "3",
    visibility_mode: "public",
    contributor_address: "",
    bond_required: false,
    bond_amount: "0",
    escrow_gen: "",
  });

  const [txState, setTxState] = useState<{
    status: "idle" | "pending" | "waiting" | "done" | "error";
    hash?: string;
    error?: string;
    seal_id?: string;
  }>({ status: "idle" });

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;

    const deadlineTs = BigInt(Math.floor(new Date(form.deadline_date).getTime() / 1000));
    if (deadlineTs <= BigInt(Math.floor(Date.now() / 1000))) {
      setTxState({ status: "error", error: "Deadline must be in the future." });
      return;
    }

    let escrowWei: bigint;
    try {
      escrowWei = genToWei(form.escrow_gen);
      if (escrowWei <= 0n) throw new Error("zero");
    } catch {
      setTxState({ status: "error", error: "Invalid GEN escrow amount." });
      return;
    }

    let bondWei = 0n;
    if (form.bond_required) {
      try {
        bondWei = genToWei(form.bond_amount);
      } catch {
        setTxState({ status: "error", error: "Invalid bond amount." });
        return;
      }
    }

    setTxState({ status: "pending" });
    try {
      const hash = await createSeal({
        title: form.title,
        category: form.category,
        deliverable_description: form.deliverable_description,
        acceptance_criteria: form.acceptance_criteria,
        required_evidence: form.required_evidence,
        deadline: deadlineTs,
        revision_limit: BigInt(parseInt(form.revision_limit) || 3),
        visibility_mode: form.visibility_mode,
        contributor_address: form.contributor_address,
        bond_required: form.bond_required,
        bond_amount: bondWei,
        value: escrowWei,
      });

      setTxState({ status: "waiting", hash });
      await waitForTxFinality(hash as `0x${string}`);
      setTxState({ status: "done", hash });
      setTimeout(() => router.push("/dashboard/buyer"), 2000);
    } catch (e) {
      setTxState({ status: "error", error: e instanceof Error ? e.message : "Transaction failed", hash: txState.hash });
    }
  }

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <Shield className="w-10 h-10 text-[#475569] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#F8FAFC] mb-2">Connect Wallet</h1>
        <p className="text-[#475569] text-sm">You must connect your wallet to create a Work Seal.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Create Work Seal</h1>
        <p className="text-[#475569] text-sm">Define the work, lock GEN escrow, and let GenLayer judge delivery.</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Seal Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Landing page redesign with mobile polish"
            className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/50"
          />
        </div>

        {/* Category + Visibility */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Visibility</label>
            <select
              value={form.visibility_mode}
              onChange={(e) => set("visibility_mode", e.target.value)}
              className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        {/* Deliverable */}
        <div>
          <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Deliverable Description *</label>
          <textarea
            required
            rows={3}
            value={form.deliverable_description}
            onChange={(e) => set("deliverable_description", e.target.value)}
            placeholder="Describe exactly what the contributor must build or produce…"
            className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/50 resize-none"
          />
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label className="block text-xs text-[#E0B64B] uppercase tracking-widest mb-1.5">
            Acceptance Criteria * <span className="text-[#475569] normal-case tracking-normal">(one per line)</span>
          </label>
          <textarea
            required
            rows={4}
            value={form.acceptance_criteria}
            onChange={(e) => set("acceptance_criteria", e.target.value)}
            placeholder={"- Mobile responsive layout\n- Passes Lighthouse score ≥ 90\n- All 5 sections implemented\n- Deployed on Vercel"}
            className="w-full bg-[#07080C]/60 border border-[#E0B64B]/20 rounded-xl px-4 py-3 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/50 resize-none font-mono"
          />
        </div>

        {/* Required Evidence */}
        <div>
          <label className="block text-xs text-[#22D3EE] uppercase tracking-widest mb-1.5">
            Required Evidence * <span className="text-[#475569] normal-case tracking-normal">(one per line)</span>
          </label>
          <textarea
            required
            rows={3}
            value={form.required_evidence}
            onChange={(e) => set("required_evidence", e.target.value)}
            placeholder={"- GitHub repository URL\n- Live Vercel deployment URL\n- Lighthouse screenshot"}
            className="w-full bg-[#07080C]/60 border border-[#22D3EE]/20 rounded-xl px-4 py-3 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#22D3EE]/50 resize-none font-mono"
          />
        </div>

        {/* Deadline + Revisions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Deadline *</label>
            <input
              required
              type="date"
              value={form.deadline_date}
              onChange={(e) => set("deadline_date", e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Revision Limit</label>
            <select
              value={form.revision_limit}
              onChange={(e) => set("revision_limit", e.target.value)}
              className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50"
            >
              {["0", "1", "2", "3", "5"].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Contributor (optional) */}
        <div>
          <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">
            Invite Contributor <span className="normal-case tracking-normal">(optional — leave blank for open)</span>
          </label>
          <input
            value={form.contributor_address}
            onChange={(e) => set("contributor_address", e.target.value)}
            placeholder="0x…"
            className="w-full bg-[#0F172A] border border-[#1e293b] rounded-xl px-4 py-3 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/50 font-mono"
          />
        </div>

        {/* Bond */}
        <div className="bg-[#0F172A] border border-[#1e293b] rounded-xl p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("bond_required", !form.bond_required)}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.bond_required ? "bg-[#E0B64B]" : "bg-[#1e293b]"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.bond_required ? "left-5" : "left-0.5"}`} />
            </div>
            <span className="text-sm text-[#CBD5E1]">Require Contributor Bond</span>
          </label>
          {form.bond_required && (
            <div className="mt-3">
              <label className="block text-xs text-[#475569] uppercase tracking-widest mb-1.5">Bond Amount (GEN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.bond_amount}
                onChange={(e) => set("bond_amount", e.target.value)}
                className="w-full bg-[#07080C] border border-[#E0B64B]/30 rounded-lg px-4 py-2.5 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50 font-mono"
              />
            </div>
          )}
        </div>

        {/* Escrow */}
        <div>
          <label className="block text-xs text-[#E0B64B] uppercase tracking-widest mb-1.5">GEN Escrow Amount *</label>
          <div className="relative">
            <input
              required
              type="number"
              min="0.000001"
              step="0.000001"
              value={form.escrow_gen}
              onChange={(e) => set("escrow_gen", e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-[#07080C] border border-[#E0B64B]/30 rounded-xl px-4 py-3 pr-16 text-sm text-[#E0B64B] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/60 font-mono font-semibold"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#475569]">GEN</span>
          </div>
          <p className="text-[10px] text-[#334155] mt-1">This GEN is locked in escrow until verdict. No zero-value seals.</p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 bg-[#1a1000]/50 border border-[#E0B64B]/20 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-[#E0B64B] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#64748B]">
            Once created, acceptance criteria cannot be changed after the contributor accepts.
            GEN escrow is locked on-chain. No admin can override the GenLayer verdict.
          </p>
        </div>

        {/* TX feedback */}
        {txState.status !== "idle" && (
          <div className={`rounded-xl p-4 border text-sm ${
            txState.status === "error" ? "bg-[#1a0000]/60 border-[#EF4444]/30 text-[#EF4444]" :
            txState.status === "done" ? "bg-[#001a08]/60 border-[#16A34A]/30 text-[#16A34A]" :
            "bg-[#0d1829] border-[#1a2540] text-[#CBD5E1]"
          }`}>
            {txState.status === "pending" && "Sending transaction…"}
            {txState.status === "waiting" && "Waiting for GenLayer consensus…"}
            {txState.status === "done" && "Seal created! Redirecting to your dashboard…"}
            {txState.status === "error" && (txState.error || "Transaction failed")}
            {txState.hash && (
              <div className="mt-2">
                <TxLink hash={txState.hash} />
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={txState.status === "pending" || txState.status === "waiting"}
          className="w-full bg-[#E0B64B] text-[#07080C] py-3 rounded-xl font-bold text-sm hover:bg-[#f0c85b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" />
          {txState.status === "pending" ? "Sending…" :
           txState.status === "waiting" ? "Waiting for consensus…" :
           "Create & Fund Work Seal"}
        </button>
      </form>
    </div>
  );
}
