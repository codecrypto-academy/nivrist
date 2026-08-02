"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { User, Target, Clock } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { DAO_ADDRESS, RPC_URL, VoteType } from "@/lib/config";
import { daoContract, proposalStatus, type ProposalView } from "@/lib/dao";
import VoteButtons from "./VoteButtons";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  executed: "bg-slate-200 text-slate-700",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  approved: "Aprobada",
  rejected: "Rechazada",
  executed: "Ejecutada",
};

const readProvider = new ethers.JsonRpcProvider(RPC_URL);

export default function ProposalCard({
  p,
  nowSec,
  onChanged,
}: {
  p: ProposalView;
  nowSec: number;
  onChanged: () => void;
}) {
  const { account } = useWeb3();
  const [currentVote, setCurrentVote] = useState<VoteType | null>(null);

  const status = proposalStatus(p, nowSec);
  const isActive = status === "active";

  // Load this user's current vote for the highlight.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!account) {
        setCurrentVote(null);
        return;
      }
      const dao = daoContract(DAO_ADDRESS, readProvider);
      const voted: boolean = await dao.hasVoted(p.id, account);
      if (cancelled) return;
      if (!voted) {
        setCurrentVote(null);
      } else {
        const v: bigint = await dao.voteOf(p.id, account);
        if (!cancelled) setCurrentVote(Number(v) as VoteType);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [account, p.id, p.votesFor, p.votesAgainst, p.votesAbstain]);

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-800">Propuesta #{p.id}</span>
            <span className={`badge ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <Target className="h-4 w-4" /> {ethers.formatEther(p.amount)} ETH →{" "}
            <span className="font-mono">{p.recipient.slice(0, 8)}…{p.recipient.slice(-6)}</span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <User className="h-3 w-3" /> por {p.proposer.slice(0, 8)}…{p.proposer.slice(-4)}
            <Clock className="ml-2 h-3 w-3" /> límite {new Date(p.deadline * 1000).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-emerald-50 py-2">
          <p className="text-xs text-emerald-600">A favor</p>
          <p className="text-lg font-semibold text-emerald-700">{p.votesFor}</p>
        </div>
        <div className="rounded-lg bg-red-50 py-2">
          <p className="text-xs text-red-600">En contra</p>
          <p className="text-lg font-semibold text-red-700">{p.votesAgainst}</p>
        </div>
        <div className="rounded-lg bg-slate-50 py-2">
          <p className="text-xs text-slate-500">Abstención</p>
          <p className="text-lg font-semibold text-slate-700">{p.votesAbstain}</p>
        </div>
      </div>

      {isActive ? (
        <VoteButtons proposalId={p.id} currentVote={currentVote} onVoted={onChanged} />
      ) : (
        <p className="text-sm text-slate-400">
          {status === "executed"
            ? "Fondos transferidos al beneficiario."
            : "Votación cerrada."}
        </p>
      )}
    </div>
  );
}
