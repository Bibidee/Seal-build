"use client";

import { useWallet } from "@/lib/context/WalletContext";
import { Wallet, Unplug, AlertTriangle } from "lucide-react";

export function WalletBar() {
  const { address, chainId, isConnecting, error, connect, disconnect } = useWallet();

  const isWrongNetwork = chainId !== null && chainId !== 61999;

  return (
    <div className="flex items-center gap-3">
      {error && (
        <div className="flex items-center gap-1.5 text-[#EF4444] text-xs">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{error.slice(0, 40)}</span>
        </div>
      )}

      {isWrongNetwork && (
        <div className="flex items-center gap-1.5 text-[#F59E0B] text-xs border border-[#F59E0B]/30 rounded px-2 py-1">
          <AlertTriangle className="w-3 h-3" />
          Wrong Network
        </div>
      )}

      {address ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0F172A] border border-[#1e293b] rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span className="text-xs font-mono text-[#CBD5E1]">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="p-1.5 rounded-lg border border-[#1e293b] text-[#475569] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-all"
          >
            <Unplug className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-[#E0B64B] text-[#07080C] px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#f0c85b] transition-all disabled:opacity-50"
        >
          <Wallet className="w-3.5 h-3.5" />
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
