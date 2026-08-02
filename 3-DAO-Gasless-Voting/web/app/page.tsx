"use client";

import { useEffect, useState } from "react";
import { Vote } from "lucide-react";
import ConnectWallet from "@/components/ConnectWallet";
import FundingPanel from "@/components/FundingPanel";
import CreateProposal from "@/components/CreateProposal";
import ProposalList from "@/components/ProposalList";
import { useDaoData } from "@/hooks/useDaoData";
import { DAO_ADDRESS, FORWARDER_ADDRESS } from "@/lib/config";

export default function Home() {
  const dao = useDaoData();
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Tick every 5s so proposal statuses (active → approved/rejected) update live.
  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-2 text-white">
            <Vote className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">DAO — Votación Gasless</h1>
            <p className="text-sm text-slate-500">Vota propuestas sin pagar gas (EIP-2771)</p>
          </div>
        </div>
        <ConnectWallet />
      </header>

      {dao.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{dao.error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <FundingPanel treasury={dao.treasury} userBalance={dao.userBalance} onFunded={dao.refresh} />
        <CreateProposal
          userBalance={dao.userBalance}
          totalDeposited={dao.totalDeposited}
          onCreated={dao.refresh}
        />
      </div>

      <div className="mt-8">
        <ProposalList
          proposals={dao.proposals}
          loading={dao.loading}
          nowSec={nowSec}
          onRefresh={dao.refresh}
          onChanged={dao.refresh}
        />
      </div>

      <footer className="mt-10 space-y-1 text-center text-xs text-slate-400">
        <p>
          DAO: <span className="mono">{DAO_ADDRESS || "no configurado"}</span>
        </p>
        <p>
          Forwarder: <span className="mono">{FORWARDER_ADDRESS || "no configurado"}</span>
        </p>
      </footer>
    </main>
  );
}
