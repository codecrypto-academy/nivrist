"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { ArrowDownUp, Loader2, PackagePlus } from "lucide-react";
import { useEthereum } from "@/lib/ethereum";
import { useEscrowStore } from "@/lib/store";
import { erc20, escrowContract, ESCROW_ADDRESS } from "@/lib/contracts";

export default function CreateOperation() {
  const { isConnected, getSigner } = useEthereum();
  const { allowedTokens, refresh } = useEscrowStore();

  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "creating">("idle");
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);

  const canSubmit = isConnected && tokenA && tokenB && amountA && amountB && tokenA !== tokenB;

  async function submit() {
    setMsg(null);
    if (tokenA === tokenB) return setMsg({ k: "err", t: "Elige tokens distintos" });
    let a: bigint, b: bigint;
    try {
      a = ethers.parseUnits(amountA, 18);
      b = ethers.parseUnits(amountB, 18);
    } catch {
      return setMsg({ k: "err", t: "Cantidades inválidas" });
    }
    if (a <= 0n || b <= 0n) return setMsg({ k: "err", t: "Las cantidades deben ser > 0" });

    try {
      const signer = await getSigner();
      setStep("approving");
      const txA = await erc20(tokenA, signer).approve(ESCROW_ADDRESS, a);
      await txA.wait();

      setStep("creating");
      const txC = await escrowContract(signer).createOperation(tokenA, tokenB, a, b);
      await txC.wait();

      setMsg({ k: "ok", t: "Operación creada" });
      setAmountA("");
      setAmountB("");
      await refresh();
    } catch (e) {
      setMsg({ k: "err", t: (e as Error).message.split("(")[0] });
    } finally {
      setStep("idle");
    }
  }

  return (
    <div className="panel-pad rise space-y-4">
      <h2 className="card-title">Nueva operación</h2>

      {/* OFFER — token A */}
      <div className="rounded-xl border border-offer/25 bg-offer/[0.04] p-3">
        <p className="label !text-offer">Ofreces</p>
        <div className="flex gap-2">
          <input className="field flex-1" placeholder="0.0" inputMode="decimal" value={amountA} onChange={(e) => setAmountA(e.target.value)} />
          <select className="field w-28" value={tokenA} onChange={(e) => setTokenA(e.target.value)}>
            <option value="">Token</option>
            {allowedTokens.map((t) => (
              <option key={t.address} value={t.address}>{t.symbol}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-void-700 text-slate-400">
          <ArrowDownUp className="h-4 w-4" />
        </div>
      </div>

      {/* REQUEST — token B */}
      <div className="rounded-xl border border-request/25 bg-request/[0.04] p-3">
        <p className="label !text-request">Pides</p>
        <div className="flex gap-2">
          <input className="field flex-1" placeholder="0.0" inputMode="decimal" value={amountB} onChange={(e) => setAmountB(e.target.value)} />
          <select className="field w-28" value={tokenB} onChange={(e) => setTokenB(e.target.value)}>
            <option value="">Token</option>
            {allowedTokens.map((t) => (
              <option key={t.address} value={t.address}>{t.symbol}</option>
            ))}
          </select>
        </div>
      </div>

      {msg && <p className={`text-xs ${msg.k === "err" ? "text-red-400" : "text-signal"}`}>{msg.t}</p>}

      <button className="btn-signal w-full" onClick={submit} disabled={!canSubmit || step !== "idle"}>
        {step === "approving" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Aprobando…</>
        ) : step === "creating" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Creando…</>
        ) : (
          <><PackagePlus className="h-4 w-4" /> Crear operación</>
        )}
      </button>
      {allowedTokens.length < 2 && (
        <p className="text-center text-xs text-slate-500">Agrega al menos 2 tokens permitidos para crear operaciones.</p>
      )}
    </div>
  );
}
