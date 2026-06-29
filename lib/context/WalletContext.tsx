"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { connectInjectedWallet, getConnectedAccounts, switchToStudionet } from "@/lib/wallet/injected";
import { setClientFromAddress, clearClient } from "@/lib/genlayer/client";

interface WalletState {
  address: `0x${string}` | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  address: null, chainId: null, isConnecting: false, error: null,
  connect: async () => {}, disconnect: () => {}, switchNetwork: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConnectedAccounts().then(async (accounts) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setClientFromAddress(accounts[0]);
        await switchToStudionet();
      }
    });

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (!accounts || accounts.length === 0) { setAddress(null); clearClient(); }
        else { setAddress(accounts[0] as `0x${string}`); setClientFromAddress(accounts[0] as `0x${string}`); }
      };
      const handleChainChanged = (...args: unknown[]) => {
        setChainId(parseInt(args[0] as string, 16));
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await switchToStudionet();
      const wallet = await connectInjectedWallet();
      setAddress(wallet.address);
      setChainId(wallet.chainId);
      setClientFromAddress(wallet.address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => { setAddress(null); setChainId(null); clearClient(); }, []);
  const switchNetwork = useCallback(async () => {
    try { await switchToStudionet(); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to switch network"); }
  }, []);

  return (
    <WalletContext.Provider value={{ address, chainId, isConnecting, error, connect, disconnect, switchNetwork }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
