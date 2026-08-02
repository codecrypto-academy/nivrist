"use client";

import { Wallet, Power, AlertTriangle } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { CHAIN_ID, shortAddr } from "@/lib/config";

export default function WalletConnect() {
  const { account, isConnected, isCorrectNetwork, chainId, connecting, error, connect, disconnect } =
    useWeb3();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-primary" onClick={() => void connect()} disabled={connecting}>
          <Wallet className="h-4 w-4" />
          {connecting ? "Conectando…" : "Conectar wallet"}
        </button>
        {error && <span className="max-w-[16rem] text-right text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isCorrectNetwork && (
        <span className="chip bg-amber-500/15 text-amber-300" title={`Cambia a chainId ${CHAIN_ID}`}>
          <AlertTriangle className="h-3 w-3" /> Red {chainId}
        </span>
      )}
      <span className="chip bg-mint/15 text-mint-400">
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
        <span className="mono">{shortAddr(account!)}</span>
      </span>
      <button className="btn-ghost !px-2.5" onClick={disconnect} title="Desconectar">
        <Power className="h-4 w-4" />
      </button>
    </div>
  );
}
