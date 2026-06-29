"use client";

import { getClient } from "./client";

const POLL_INTERVAL = 10_000;
const MAX_ATTEMPTS = 60;

const STATUS_MAP: Record<number, string> = {
  0: "pending",
  1: "proposing",
  2: "committing",
  3: "revealing",
  4: "accepted",
  5: "finalized",
  6: "undetermined",
  7: "cancelled",
};

function getStatus(receipt: unknown): string {
  if (!receipt || typeof receipt !== "object") return "";
  const raw = (receipt as Record<string, unknown>)["status"];
  if (typeof raw === "number") return STATUS_MAP[raw] ?? String(raw);
  return String(raw ?? "").toLowerCase();
}

export async function waitForTxFinality(txHash: `0x${string}`): Promise<string> {
  const client = getClient();

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receipt = await (client as any).getTransaction({ hash: txHash });
      if (receipt) {
        const status = getStatus(receipt);
        if (status === "accepted" || status === "finalized") return status;
        if (status === "cancelled" || status === "undetermined") {
          throw new Error(`Transaction ${status}`);
        }
      }
    } catch (e) {
      if (e instanceof Error && (e.message.includes("cancelled") || e.message.includes("undetermined"))) {
        throw e;
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error("Transaction timed out waiting for GenLayer consensus.");
}

export { waitForTxFinality as waitForTx };
