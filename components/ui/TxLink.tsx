import { ExternalLink } from "lucide-react";
import { explorerTx } from "@/lib/genlayer/sealClient";

export function TxLink({ hash, label = "View on Explorer" }: { hash: string; label?: string }) {
  return (
    <a
      href={explorerTx(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-[#22D3EE] hover:text-[#7dd3fc] transition-colors font-mono"
    >
      <ExternalLink className="w-3 h-3" />
      {label}
    </a>
  );
}
