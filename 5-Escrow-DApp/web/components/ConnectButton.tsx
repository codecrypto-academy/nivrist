"use client";

import { useEffect, useState } from "react";
import { Wallet, Power, AlertTriangle } from "lucide-react";
import { useEthereum } from "@/lib/ethereum";
import { CHAIN_ID } from "@/lib/contracts";

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ConnectButton() {
  const { account, isConnected, isCorrectNetwork, chainId, connecting, error, connect, disconnect } =
    useEthereum();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid hydration mismatch: render nothing wallet-specific until mounted.
  if (!mounted) return <div className="h-9 w-32" />;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-signal" onClick={() => void connect()} disabled={connecting}>
          <Wallet className="h-4 w-4" />
          {connecting ? "Conectando…" : "Connect Wallet"}
        </button>
        {error && <span className="max-w-[16rem] text-right text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isCorrectNetwork && (
        <span className="tag border-amber-500/40 bg-amber-500/10 text-amber-300" title={`Cambia a ${CHAIN_ID}`}>
          <AlertTriangle className="h-3 w-3" /> Red {chainId}
        </span>
      )}
      <span className="tag border-signal/40 bg-signal/10 text-signal">
        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
        <span className="mono">{short(account!)}</span>
      </span>
      <button className="btn-ghost !px-2.5" onClick={disconnect} title="Disconnect">
        <Power className="h-4 w-4" />
      </button>
    </div>
  );
}
