"use client";

import { Wallet, Power } from "lucide-react";
import { useWallet } from "@/contexts/MetaMaskContext";

export default function WalletSelector() {
  const { wallets, walletIndex, account, isConnected, connect, disconnect, switchWallet } = useWallet();

  if (wallets.length === 0) {
    return (
      <span className="text-sm text-red-600">
        No mnemonic configured — set NEXT_PUBLIC_MNEMONIC in .env.local
      </span>
    );
  }

  if (!isConnected) {
    return (
      <button className="btn-primary" onClick={() => connect(0)}>
        <Wallet className="h-4 w-4" /> Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden h-2 w-2 rounded-full bg-emerald-500 sm:inline-block" />
      <select
        value={walletIndex ?? 0}
        onChange={(e) => switchWallet(Number(e.target.value))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
      >
        {wallets.map((w) => (
          <option key={w.index} value={w.index}>
            Wallet {w.index} — {w.address.slice(0, 6)}…{w.address.slice(-4)}
          </option>
        ))}
      </select>
      <span className="mono hidden text-slate-500 md:inline" title={account ?? ""}>
        {account}
      </span>
      <button className="btn-secondary" onClick={disconnect} title="Disconnect">
        <Power className="h-4 w-4" />
      </button>
    </div>
  );
}
