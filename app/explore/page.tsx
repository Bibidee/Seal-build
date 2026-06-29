"use client";

import { useEffect, useState } from "react";
import { Search, FolderSearch } from "lucide-react";
import { getPublicSeals } from "@/lib/genlayer/sealClient";
import { SealCard } from "@/components/seal/SealCard";
import type { SealSummary } from "@/lib/genlayer/types";

const CATEGORIES = ["All", "Development", "Design", "Content", "Research", "AI", "Other"];
const STATUSES   = ["All", "funded", "accepted", "delivery_submitted", "accepted_full", "rejected"];

export default function CasesPage() {
  const [seals, setSeals]     = useState<SealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus]   = useState("All");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
      setError("Contract not deployed — set NEXT_PUBLIC_CONTRACT_ADDRESS");
      setLoading(false);
      return;
    }
    getPublicSeals(0, 100)
      .then(({ seals }) => setSeals(seals))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load cases"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = seals.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && s.category !== category) return false;
    if (status !== "All" && s.status !== status) return false;
    return true;
  });

  const inputCls = "bg-[#0C1118] border border-[#182030] text-sm text-[#E8EDF5] placeholder-[#2A3A50] focus:outline-none focus:border-[#00C9E8]/50 px-3 py-2 font-mono";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FolderSearch className="w-4 h-4 text-[#00C9E8]" />
          <h1 className="text-3xl font-bold text-[#E8EDF5]" style={{ fontFamily: "var(--font-display)" }}>CASES</h1>
        </div>
        <p className="manifest-label">PUBLIC DELIVERY MANIFESTS · LOCKED GEN ESCROW</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[#182030] pb-5">
        <div className="flex-1 min-w-44 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#2A3A50]" />
          <input
            type="text"
            placeholder="SEARCH CASES…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 ${inputCls}`}
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="manifest-label">LOADING CASES…</div>
        </div>
      )}

      {error && (
        <div className="text-center py-16 font-mono text-[11px] text-[#FF2D4A] border border-[#FF2D4A]/20 bg-[#220010]">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-[#5C7090] text-sm">
          No public cases found.{" "}
          <a href="/create" className="text-[#00C9E8] hover:underline">Open the first seal.</a>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="manifest-label mb-3">{filtered.length} CASE{filtered.length !== 1 ? "S" : ""} FOUND</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((seal) => <SealCard key={seal.seal_id} seal={seal} />)}
          </div>
        </>
      )}
    </div>
  );
}
