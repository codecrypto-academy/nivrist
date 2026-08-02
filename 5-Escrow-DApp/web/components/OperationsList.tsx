"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { ArrowRight, Loader2, X, Check, Inbox } from "lucide-react";
import { useEthereum } from "@/lib/ethereum";
import { useEscrowStore } from "@/lib/store";
import { erc20, escrowContract, ESCROW_ADDRESS, type Operation } from "@/lib/contracts";

function fmt(v: bigint) {
  return Number(ethers.formatUnits(v, 18)).toLocaleString("es-ES");
}
function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function OperationsList() {
  const { account, isConnected, getSigner } = useEthereum();
  const { operations, symbolOf, refresh } = useEscrowStore();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function complete(op: Operation) {
    setError(null);
    try {
      setBusy(op.id);
      const signer = await getSigner();
      // Taker approves the escrow to pull token B, then completes.
      const txA = await erc20(op.tokenB, signer).approve(ESCROW_ADDRESS, op.amountB);
      await txA.wait();
      const txC = await escrowContract(signer).completeOperation(op.id);
      await txC.wait();
      await refresh();
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
    } finally {
      setBusy(null);
    }
  }

  async function cancel(op: Operation) {
    setError(null);
    try {
      setBusy(op.id);
      const tx = await escrowContract(await getSigner()).cancelOperation(op.id);
      await tx.wait();
      await refresh();
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
    } finally {
      setBusy(null);
    }
  }

  const sorted = [...operations].reverse();

  return (
    <div className="panel-pad rise space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="card-title">Operaciones</h2>
        <span className="tag border-white/15 bg-white/5 text-slate-400">{operations.length}</span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {operations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
          <Inbox className="h-7 w-7" />
          <p className="text-sm">No hay operaciones activas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((op) => {
            const mine = !!account && account.toLowerCase() === op.creator.toLowerCase();
            return (
              <div key={op.id} className="rounded-xl border border-white/10 bg-void-700/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="mono text-slate-500">#{op.id} · {short(op.creator)}{mine && " (tú)"}</span>
                  <span className={`tag ${op.active ? "border-signal/40 bg-signal/10 text-signal" : "border-white/15 bg-white/5 text-slate-500"}`}>
                    {op.active ? "Active" : "Closed"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-lg border border-offer/25 bg-offer/[0.05] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-offer/80">Ofrece</p>
                    <p className="font-display text-lg font-bold text-slate-100">
                      {fmt(op.amountA)} <span className="text-sm text-offer">{symbolOf(op.tokenA)}</span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
                  <div className="flex-1 rounded-lg border border-request/25 bg-request/[0.05] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-request/80">Pide</p>
                    <p className="font-display text-lg font-bold text-slate-100">
                      {fmt(op.amountB)} <span className="text-sm text-request">{symbolOf(op.tokenB)}</span>
                    </p>
                  </div>
                </div>

                {op.active && isConnected && (
                  <div className="mt-3">
                    {mine ? (
                      <button className="btn-danger w-full" onClick={() => void cancel(op)} disabled={busy === op.id}>
                        {busy === op.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Cancel Operation
                      </button>
                    ) : (
                      <button className="btn-offer w-full" onClick={() => void complete(op)} disabled={busy === op.id}>
                        {busy === op.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Complete Operation
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
