"use client";

import { useState } from "react";
import { Loader2, ThumbsUp, ThumbsDown, MinusCircle, Zap } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { VoteType } from "@/lib/config";
import { signAndRelayVote } from "@/lib/gasless";

export default function VoteButtons({
  proposalId,
  currentVote,
  onVoted,
}: {
  proposalId: number;
  currentVote: VoteType | null;
  onVoted: () => void;
}) {
  const { isConnected, getSigner } = useWeb3();
  const [busy, setBusy] = useState<VoteType | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function cast(v: VoteType) {
    setMsg(null);
    try {
      setBusy(v);
      const signer = await getSigner();
      const txHash = await signAndRelayVote(signer, proposalId, v);
      setMsg({ kind: "ok", text: `Voto enviado (gasless) · tx ${txHash.slice(0, 10)}…` });
      onVoted();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const options: { v: VoteType; label: string; icon: typeof ThumbsUp; active: string }[] = [
    { v: VoteType.For, label: "A favor", icon: ThumbsUp, active: "bg-emerald-600 text-white" },
    { v: VoteType.Against, label: "En contra", icon: ThumbsDown, active: "bg-red-600 text-white" },
    { v: VoteType.Abstain, label: "Abstención", icon: MinusCircle, active: "bg-slate-500 text-white" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs text-indigo-500">
        <Zap className="h-3 w-3" /> Voto sin gas (meta-transacción)
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(({ v, label, icon: Icon, active }) => (
          <button
            key={v}
            onClick={() => void cast(v)}
            disabled={!isConnected || busy !== null}
            className={`btn text-sm ${
              currentVote === v ? active : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {busy === v ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {label}
            {currentVote === v && " ✓"}
          </button>
        ))}
      </div>
      {msg && (
        <p className={`text-xs ${msg.kind === "err" ? "text-red-600" : "text-emerald-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
