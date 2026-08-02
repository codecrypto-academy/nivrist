"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { FilePlus2, Loader2 } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { DAO_ADDRESS } from "@/lib/config";
import { daoContract } from "@/lib/dao";

export default function CreateProposal({
  userBalance,
  totalDeposited,
  onCreated,
}: {
  userBalance: bigint;
  totalDeposited: bigint;
  onCreated: () => void;
}) {
  const { isConnected, getSigner } = useWeb3();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Eligible when stake >= 10% of the total deposited.
  const eligible = useMemo(
    () => totalDeposited > 0n && userBalance * 10n >= totalDeposited,
    [userBalance, totalDeposited]
  );
  const sharePct = useMemo(
    () => (totalDeposited > 0n ? (Number(userBalance) / Number(totalDeposited)) * 100 : 0),
    [userBalance, totalDeposited]
  );

  async function create() {
    setMsg(null);
    if (!ethers.isAddress(recipient)) {
      setMsg({ kind: "err", text: "Dirección de beneficiario inválida" });
      return;
    }
    let value: bigint;
    try {
      value = ethers.parseEther(amount || "0");
    } catch {
      setMsg({ kind: "err", text: "Cantidad inválida" });
      return;
    }
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    if (!deadlineTs || deadlineTs <= Math.floor(Date.now() / 1000)) {
      setMsg({ kind: "err", text: "La fecha límite debe estar en el futuro" });
      return;
    }
    try {
      setBusy(true);
      const signer = await getSigner();
      const dao = daoContract(DAO_ADDRESS, signer);
      const tx = await dao.createProposal(recipient, value, deadlineTs);
      await tx.wait();
      setMsg({ kind: "ok", text: "Propuesta creada" });
      setRecipient("");
      setAmount("");
      setDeadline("");
      onCreated();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <FilePlus2 className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-slate-800">Crear propuesta</h2>
      </div>

      <p className="text-sm text-slate-500">
        Tu participación: <span className="font-medium">{sharePct.toFixed(1)}%</span>{" "}
        {eligible ? (
          <span className="text-emerald-600">— puedes proponer ✓</span>
        ) : (
          <span className="text-amber-600">— necesitas ≥ 10% para proponer</span>
        )}
      </p>

      <div className="space-y-3">
        <div>
          <label className="label">Beneficiario</label>
          <input className="input mt-1 font-mono" placeholder="0x…" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto (ETH)</label>
            <input className="input mt-1" placeholder="1.0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label">Fecha límite</label>
            <input className="input mt-1" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={create} disabled={!isConnected || !eligible || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
        Crear propuesta
      </button>

      {msg && (
        <p className={`text-sm ${msg.kind === "err" ? "text-red-600" : "text-emerald-600"}`}>{msg.text}</p>
      )}
    </div>
  );
}
