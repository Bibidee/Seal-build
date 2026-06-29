"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, Plus, Minus, TriangleAlert, Anchor } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { createSeal, genToWei } from "@/lib/genlayer/sealClient";
import { waitForTxFinality } from "@/lib/genlayer/txWaiter";
import { TxLink } from "@/components/ui/TxLink";

const CATEGORIES = ["Development", "Design", "Content", "Research", "AI", "Other"];

const inputCls = "w-full bg-[#080B10] border border-[#182030] px-4 py-3 text-sm text-[#E8EDF5] placeholder-[#2A3A50] focus:outline-none focus:border-[#00C9E8]/50 font-mono";
const labelCls = "block manifest-label mb-2";

export default function OpenSealPage() {
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
      try { bondWei = genToWei(form.bond_amount); } catch {
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
      setTxState({ status: "error", error: e instanceof Error ? e.message : "Transaction failed" });
    }
  }

  if (!address) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <div className="w-12 h-12 border border-[#182030] flex items-center justify-center mx-auto mb-4">
          <Anchor className="w-5 h-5 text-[#5C7090]" />
        </div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] mb-2" style={{ fontFamily: "var(--font-display)" }}>
          CONNECT WALLET
        </h1>
        <p className="text-[#5C7090] text-sm">Connect your wallet to open a Work Seal.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FilePlus2 className="w-4 h-4 text-[#00C9E8]" />
          <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>OPEN SEAL</h1>
        </div>
        <p className="manifest-label">DEFINE WORK · LOCK GEN · LET GENLAYER JUDGE DELIVERY</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-5">
        {/* Title */}
        <div>
          <label className={labelCls}>SEAL TITLE *</label>
          <input required value={form.title} onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Landing page redesign with mobile polish"
            className={inputCls} />
        </div>

        {/* Category + Visibility */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>CATEGORY</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}
              className={inputCls}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>VISIBILITY</label>
            <select value={form.visibility_mode} onChange={(e) => set("visibility_mode", e.target.value)}
              className={inputCls}>
              <option value="public">PUBLIC</option>
              <option value="private">PRIVATE</option>
            </select>
          </div>
        </div>

        {/* Deliverable */}
        <div>
          <label className={labelCls}>DELIVERY MANIFEST — DELIVERABLE SCOPE *</label>
          <textarea required rows={3} value={form.deliverable_description}
            onChange={(e) => set("deliverable_description", e.target.value)}
            placeholder="Describe exactly what the contributor must build or produce…"
            className={`${inputCls} resize-none`} />
        </div>

        {/* Acceptance Criteria */}
        <div className="border border-[#00C9E8]/25 bg-[#001E28]" style={{ borderLeft: "2px solid #00C9E8" }}>
          <div className="px-4 pt-3">
            <label className="block manifest-label text-[#00C9E8] mb-2">
              INSPECTION CRITERIA — ACCEPTANCE CONDITIONS * <span className="text-[#2A3A50]">(ONE PER LINE)</span>
            </label>
            <textarea required rows={4} value={form.acceptance_criteria}
              onChange={(e) => set("acceptance_criteria", e.target.value)}
              placeholder={"- Mobile responsive layout\n- Lighthouse score ≥ 90\n- All sections implemented\n- Deployed on Vercel"}
              className="w-full bg-transparent border-0 px-0 py-0 pb-3 text-sm text-[#A0B4C8] placeholder-[#2A3A50] focus:outline-none resize-none font-mono"
            />
          </div>
        </div>

        {/* Required Evidence */}
        <div className="border border-[#F5C000]/25 bg-[#110E00]" style={{ borderLeft: "2px solid #F5C000" }}>
          <div className="px-4 pt-3">
            <label className="block manifest-label text-[#F5C000] mb-2">
              EVIDENCE CRATE — REQUIRED PROOF * <span className="text-[#2A3A50]">(ONE PER LINE)</span>
            </label>
            <textarea required rows={3} value={form.required_evidence}
              onChange={(e) => set("required_evidence", e.target.value)}
              placeholder={"- GitHub repository URL\n- Live Vercel deployment URL\n- Lighthouse screenshot"}
              className="w-full bg-transparent border-0 px-0 py-0 pb-3 text-sm text-[#A0B4C8] placeholder-[#2A3A50] focus:outline-none resize-none font-mono"
            />
          </div>
        </div>

        {/* Deadline + Revisions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>DEADLINE *</label>
            <input required type="date" value={form.deadline_date}
              onChange={(e) => set("deadline_date", e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>REVISION LIMIT</label>
            <select value={form.revision_limit} onChange={(e) => set("revision_limit", e.target.value)}
              className={inputCls}>
              {["0", "1", "2", "3", "5"].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Contributor */}
        <div>
          <label className={labelCls}>
            INVITE CONTRIBUTOR <span className="text-[#2A3A50] normal-case">(optional — leave blank for open)</span>
          </label>
          <input value={form.contributor_address} onChange={(e) => set("contributor_address", e.target.value)}
            placeholder="0x…"
            className={inputCls} />
        </div>

        {/* Bond toggle */}
        <div className="dock-panel p-4">
          <label className="flex items-center gap-3 cursor-pointer mb-0">
            <button
              type="button"
              onClick={() => set("bond_required", !form.bond_required)}
              className={`w-10 h-5 relative transition-colors flex-shrink-0 ${form.bond_required ? "bg-[#00C9E8]" : "bg-[#182030]"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${form.bond_required ? "left-5" : "left-0.5"}`} />
            </button>
            <span className="text-sm text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
              REQUIRE CONTRIBUTOR BOND
            </span>
          </label>
          {form.bond_required && (
            <div className="mt-3 pt-3 border-t border-[#182030]">
              <label className={labelCls}>BOND AMOUNT (GEN)</label>
              <input type="number" min="0" step="0.01" value={form.bond_amount}
                onChange={(e) => set("bond_amount", e.target.value)}
                className={inputCls} />
            </div>
          )}
        </div>

        {/* Escrow */}
        <div>
          <label className="block manifest-label text-[#00C9E8] mb-2">GEN ESCROW AMOUNT *</label>
          <div className="relative">
            <input required type="number" min="0.000001" step="0.000001" value={form.escrow_gen}
              onChange={(e) => set("escrow_gen", e.target.value)}
              placeholder="e.g. 500"
              className={`${inputCls} pr-16 text-[#00C9E8] text-base font-semibold`}
              style={{ borderColor: "#00C9E830", borderLeftColor: "#00C9E8", borderLeftWidth: 2 }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 manifest-label">GEN</span>
          </div>
          <p className="manifest-label mt-1 text-[#2A3A50]">GEN IS LOCKED IN ESCROW UNTIL VERDICT. NO ZERO-VALUE SEALS.</p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2.5 bg-[#211D00] border border-[#F5C000]/20 p-3">
          <TriangleAlert className="w-4 h-4 text-[#F5C000] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#5C7090]">
            Once created, acceptance criteria cannot be changed after the contributor accepts.
            GEN escrow is locked on-chain. No admin can override the GenLayer verdict.
          </p>
        </div>

        {/* TX state */}
        {txState.status !== "idle" && (
          <div className={`p-4 border text-sm font-mono text-[12px] ${
            txState.status === "error" ? "bg-[#220010] border-[#FF2D4A]/30 text-[#FF2D4A]" :
            txState.status === "done" ? "bg-[#001F0F] border-[#00E87A]/30 text-[#00E87A]" :
            "bg-[#001E28] border-[#00C9E8]/20 text-[#00C9E8]"
          }`}>
            {txState.status === "pending" && "SENDING TRANSACTION…"}
            {txState.status === "waiting" && "AWAITING GENLAYER CONSENSUS…"}
            {txState.status === "done" && "SEAL CREATED — REDIRECTING TO BUYER DESK…"}
            {txState.status === "error" && (txState.error || "TRANSACTION FAILED")}
            {txState.hash && <div className="mt-2"><TxLink hash={txState.hash} /></div>}
          </div>
        )}

        <button
          type="submit"
          disabled={txState.status === "pending" || txState.status === "waiting"}
          className="w-full bg-[#00C9E8] text-[#080B10] py-3.5 font-bold tracking-widest hover:bg-[#00DFFE] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontFamily: "var(--font-display)", fontSize: 15 }}
        >
          <FilePlus2 className="w-4 h-4" />
          {txState.status === "pending" ? "SENDING…" :
           txState.status === "waiting" ? "AWAITING CONSENSUS…" :
           "CREATE & FUND WORK SEAL"}
        </button>
      </form>
    </div>
  );
}
