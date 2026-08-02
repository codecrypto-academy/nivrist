"use client";

import { ArrowLeftRight, ShieldCheck } from "lucide-react";
import ConnectButton from "@/components/ConnectButton";
import AddToken from "@/components/AddToken";
import CreateOperation from "@/components/CreateOperation";
import OperationsList from "@/components/OperationsList";
import BalanceDebug from "@/components/BalanceDebug";
import { useEthereum } from "@/lib/ethereum";

export default function Home() {
  const { isConnected } = useEthereum();

  return (
    <div className="min-h-screen">
      {/* header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-void/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-offer/30 bg-offer/10 text-offer">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-100">
                Escrow<span className="text-offer">·</span>DApp
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Swaps ERC-20 on-chain</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {!isConnected ? (
          <div className="mx-auto max-w-2xl">
            <div className="panel-pad rise text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-offer/30 bg-offer/10 text-offer">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h2 className="font-display text-3xl font-extrabold text-slate-100">Intercambia sin confianza</h2>
              <p className="mx-auto mt-2 max-w-md text-slate-400">
                Bloquea tu <span className="text-offer">Token A</span>, pide{" "}
                <span className="text-request">Token B</span>, y deja que el contrato haga el swap
                atómico. Conecta tu wallet para empezar.
              </p>
              <div className="mt-6 flex justify-center">
                <ConnectButton />
              </div>
            </div>

            {/* still show the public debug panel */}
            <div className="mt-6">
              <BalanceDebug />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <AddToken />
              <CreateOperation />
            </div>
            <div>
              <OperationsList />
            </div>
            <div>
              <BalanceDebug />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-xs text-slate-600">
        Escrow DApp · Solidity + Foundry + Next.js · red local Anvil (chainId 31337)
      </footer>
    </div>
  );
}
