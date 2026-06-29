"use client";

import { useWallet } from "@/lib/context/WalletContext";
import { Unplug, AlertTriangle, Anchor } from "lucide-react";

export function WalletBar() {
  const { address, chainId, isConnecting, error, connect, disconnect } = useWallet();
  const isWrongNetwork = chainId !== null && chainId !== 61999;

  return (
    <div className="flex items-center gap-3">
      {error && (
        <div className="flex items-center gap-1.5 text-[#FF2D4A] text-[11px] font-mono">
          <AlertTriangle className="w-3 h-3" />
          {error.slice(0, 36)}
        </div>
      )}

      {isWrongNetwork && (
        <div className="flex items-center gap-1.5 text-[#F5C000] text-[11px] font-mono border border-[#F5C000]/30 bg-[#211D00] px-2 py-1">
          <AlertTriangle className="w-3 h-3" />
          WRONG NETWORK
        </div>
      )}

      {address ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0C1118] border border-[#182030] px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00E87A] pulse-cyan" />
            <span className="text-[11px] font-mono text-[#A0B4C8]">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="p-1.5 border border-[#182030] text-[#5C7090] hover:text-[#FF2D4A] hover:border-[#FF2D4A]/40 transition-all"
          >
            <Unplug className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-[#00C9E8] text-[#080B10] px-4 py-1.5 text-xs font-bold tracking-widest hover:bg-[#00DFFE] transition-all disabled:opacity-50"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}
        >
          <Anchor className="w-3.5 h-3.5" />
          {isConnecting ? "CONNECTING…" : "CONNECT WALLET"}
        </button>
      )}
    </div>
  );
}
