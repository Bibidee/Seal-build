"use client";

import { useEffect, useState } from "react";
import { Search, Filter } from "lucide-react";
import { getPublicSeals } from "@/lib/genlayer/sealClient";
import { SealCard } from "@/components/seal/SealCard";
import type { SealSummary } from "@/lib/genlayer/types";

const CATEGORIES = ["All", "Development", "Design", "Content", "Research", "AI", "Other"];
const STATUSES = ["All", "funded", "accepted", "delivery_submitted", "accepted_full", "rejected"];

export default function ExplorePage() {
  const [seals, setSeals] = useState<SealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  useEffect(() => {
    const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!addr) {
      setError("Contract not deployed — set NEXT_PUBLIC_CONTRACT_ADDRESS");
      setLoading(false);
      return;
    }
    getPublicSeals(0, 100)
      .then(({ seals }) => setSeals(seals))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load seals"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = seals.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && s.category !== category) return false;
    if (status !== "All" && s.status !== status) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-1">Explore Seals</h1>
        <p className="text-[#475569] text-sm">Public work orders with locked GEN escrow.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
          <input
            type="text"
            placeholder="Search seals…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0F172A] border border-[#1e293b] rounded-lg pl-9 pr-3 py-2 text-sm text-[#CBD5E1] placeholder-[#334155] focus:outline-none focus:border-[#E0B64B]/50"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-[#0F172A] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-[#0F172A] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#CBD5E1] focus:outline-none focus:border-[#E0B64B]/50"
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading && (
        <div className="text-center py-16 text-[#475569] text-sm">Loading seals…</div>
      )}

      {error && (
        <div className="text-center py-16 text-[#EF4444] text-sm bg-[#1a0000]/50 border border-[#EF4444]/20 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-[#475569] text-sm">
          No public seals found. <a href="/create" className="text-[#E0B64B] hover:underline">Create the first one.</a>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((seal) => (
          <SealCard key={seal.seal_id} seal={seal} />
        ))}
      </div>
    </div>
  );
}
