"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { Coins, Loader2 } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { DAO_ADDRESS } from "@/lib/config";
import { daoContract } from "@/lib/dao";

export default function FundingPanel({
  treasury,
  userBalance,
  onFunded,
}: {
  treasury: bigint;
  userBalance: bigint;
  onFunded: () => void;
}) {
  const { isConnected, getSigner } = useWeb3();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function fund() {
    setMsg(null);
    let value: bigint;
    try {
      value = ethers.parseEther(amount || "0");
    } catch {
      setMsg({ kind: "err", text: "Cantidad inválida" });
      return;
    }
    if (value <= 0n) {
      setMsg({ kind: "err", text: "Ingresa una cantidad mayor a 0" });
      return;
    }
    try {
      setBusy(true);
      const signer = await getSigner();
      const dao = daoContract(DAO_ADDRESS, signer);
      const tx = await dao.fundDAO({ value });
      await tx.wait();
      setMsg({ kind: "ok", text: `Depositaste ${amount} ETH` });
      setAmount("");
      onFunded();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-slate-800">Financiar el DAO</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Tu balance en el DAO</p>
          <p className="text-lg font-semibold">{ethers.formatEther(userBalance)} ETH</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500">Tesorería total</p>
          <p className="text-lg font-semibold">{ethers.formatEther(treasury)} ETH</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Cantidad en ETH"
          value={amount}
          inputMode="decimal"
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="btn-primary whitespace-nowrap" onClick={fund} disabled={!isConnected || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
          Depositar
        </button>
      </div>

      {msg && (
        <p className={`text-sm ${msg.kind === "err" ? "text-red-600" : "text-emerald-600"}`}>
          {msg.text}
        </p>
      )}
      {!isConnected && <p className="text-sm text-amber-600">Conecta tu wallet para depositar.</p>}
    </div>
  );
}
