"use client";

import { useState } from "react";
import { FileSignature, ShieldCheck, History } from "lucide-react";
import WalletSelector from "@/components/WalletSelector";
import DocumentSigner from "@/components/DocumentSigner";
import DocumentVerifier from "@/components/DocumentVerifier";
import DocumentHistory from "@/components/DocumentHistory";
import { useContract } from "@/hooks/useContract";

type TabId = "upload" | "verify" | "history";

const TABS: { id: TabId; label: string; icon: typeof FileSignature }[] = [
  { id: "upload", label: "Upload & Sign", icon: FileSignature },
  { id: "verify", label: "Verify", icon: ShieldCheck },
  { id: "history", label: "History", icon: History },
];

export default function Home() {
  const [tab, setTab] = useState<TabId>("upload");
  const { contractAddress } = useContract();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ETH Document Registry</h1>
          <p className="text-sm text-slate-500">
            Immutable, verifiable document authenticity on Ethereum
          </p>
        </div>
        <WalletSelector />
      </header>

      <nav className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {tab === "upload" && <DocumentSigner />}
      {tab === "verify" && <DocumentVerifier />}
      {tab === "history" && <DocumentHistory />}

      <footer className="mt-8 text-center text-xs text-slate-400">
        Contract:{" "}
        <span className="mono">{contractAddress || "not configured"}</span> · Anvil local (chainId 31337)
      </footer>
    </main>
  );
}
