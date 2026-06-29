"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient } from "genlayer-js/types";
import type { GenLayerChain } from "genlayer-js/types";

let _client: GenLayerClient<GenLayerChain> | null = null;

function rpc() {
  return process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
}

export function getClient(): GenLayerClient<GenLayerChain> {
  if (!_client) {
    _client = createClient({ chain: studionet, endpoint: rpc() });
  }
  return _client;
}

export async function getClientReady(): Promise<GenLayerClient<GenLayerChain>> {
  if (typeof window !== "undefined" && window.ethereum) {
    const expected = "0x" + (61999).toString(16);
    const current = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    if (current.toLowerCase() !== expected.toLowerCase()) {
      const { switchToStudionet } = await import("@/lib/wallet/injected");
      await switchToStudionet();
    }
  }
  return getClient();
}

export function setClientFromAddress(address: `0x${string}`) {
  _client = createClient({ chain: studionet, endpoint: rpc(), account: address });
  return address;
}

export function clearClient() {
  _client = null;
}
