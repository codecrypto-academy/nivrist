"use client";

import { RefreshCw, Loader2, Inbox } from "lucide-react";
import type { ProposalView } from "@/lib/dao";
import ProposalCard from "./ProposalCard";

export default function ProposalList({
  proposals,
  loading,
  nowSec,
  onRefresh,
  onChanged,
}: {
  proposals: ProposalView[];
  loading: boolean;
  nowSec: number;
  onRefresh: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">
          Propuestas <span className="text-slate-400">({proposals.length})</span>
        </h2>
        <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualizar
        </button>
      </div>

      {proposals.length === 0 && !loading && (
        <div className="card flex flex-col items-center gap-2 py-10 text-slate-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">Aún no hay propuestas.</p>
        </div>
      )}

      <div className="space-y-4">
        {[...proposals].reverse().map((p) => (
          <ProposalCard key={p.id} p={p} nowSec={nowSec} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}
