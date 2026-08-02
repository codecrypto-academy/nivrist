"use client";

import { Wallet, Power, AlertTriangle } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { CHAIN_ID, shortAddr } from "@/lib/config";

export default function WalletButton() {
  const { account, isConnected, isCorrectNetwork, chainId, connecting, connect, disconnect } = useWeb3();

  if (!isConnected) {
    return (
      <button className="btn-ink" onClick={() => void connect()} disabled={connecting}>
        <Wallet className="h-4 w-4" />
        {connecting ? "Conectando…" : "Conectar"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isCorrectNetwork && (
        <span className="tag bg-coral text-ink" title={`Cambia a chainId ${CHAIN_ID}`}>
          <AlertTriangle className="h-3 w-3" /> Red {chainId}
        </span>
      )}
      <span className="tag bg-grass text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        <span className="mono">{shortAddr(account!)}</span>
      </span>
      <button className="btn-outline !px-2.5" onClick={disconnect} title="Desconectar">
        <Power className="h-4 w-4" />
      </button>
    </div>
  );
}
