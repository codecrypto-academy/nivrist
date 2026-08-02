"use client";

import { Wallet, AlertTriangle } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { CHAIN_ID } from "@/lib/config";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ConnectWallet() {
  const { account, isConnected, isCorrectNetwork, chainId, connecting, error, connect, disconnect } =
    useWeb3();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-primary" onClick={() => void connect()} disabled={connecting}>
          <Wallet className="h-4 w-4" />
          {connecting ? "Conectando…" : "Conectar MetaMask"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isCorrectNetwork && (
        <span className="badge bg-amber-100 text-amber-700" title={`Cambia a chainId ${CHAIN_ID}`}>
          <AlertTriangle className="mr-1 h-3 w-3" /> Red incorrecta ({chainId})
        </span>
      )}
      <span className="badge bg-emerald-100 text-emerald-700">
        <span className="mr-1 h-2 w-2 rounded-full bg-emerald-500" />
        {shortAddr(account!)}
      </span>
      <button className="btn-secondary" onClick={disconnect}>
        Salir
      </button>
    </div>
  );
}
