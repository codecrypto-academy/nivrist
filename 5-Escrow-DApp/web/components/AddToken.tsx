"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { Plus, Loader2, Coins, Crown } from "lucide-react";
import { useEthereum } from "@/lib/ethereum";
import { useEscrowStore } from "@/lib/store";
import { escrowContract, ESCROW_ADDRESS, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS } from "@/lib/contracts";

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function AddToken() {
  const { account, isConnected, getSigner } = useEthereum();
  const { owner, allowedTokens, refresh } = useEscrowStore();
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);

  const isOwner = !!account && !!owner && account.toLowerCase() === owner.toLowerCase();

  async function add(value?: string) {
    const target = (value ?? addr).trim();
    setMsg(null);
    if (!ethers.isAddress(target)) return setMsg({ k: "err", t: "Dirección inválida" });
    try {
      setBusy(true);
      const escrow = escrowContract(await getSigner());
      const tx = await escrow.addToken(target);
      await tx.wait();
      setMsg({ k: "ok", t: "Token agregado" });
      setAddr("");
      await refresh();
    } catch (e) {
      setMsg({ k: "err", t: (e as Error).message.split("(")[0] });
    } finally {
      setBusy(false);
    }
  }

  const presets = [
    { label: "Token A (TKA)", address: TOKEN_A_ADDRESS },
    { label: "Token B (TKB)", address: TOKEN_B_ADDRESS },
  ].filter((p) => !allowedTokens.some((t) => t.address.toLowerCase() === p.address.toLowerCase()));

  return (
    <div className="panel-pad rise space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="card-title">Tokens permitidos</h2>
        {isOwner && (
          <span className="tag border-request/40 bg-request/10 text-request">
            <Crown className="h-3 w-3" /> Owner
          </span>
        )}
      </div>

      <p className="mono text-slate-500">
        Escrow: <span className="text-offer">{short(ESCROW_ADDRESS)}</span>
      </p>

      {/* list */}
      <div className="space-y-2">
        {allowedTokens.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay tokens permitidos.</p>
        ) : (
          allowedTokens.map((t) => (
            <div key={t.address} className="flex items-center justify-between rounded-lg bg-void-700/60 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-slate-200">
                <Coins className="h-4 w-4 text-offer" /> {t.symbol}
              </span>
              <span className="mono text-slate-500">{short(t.address)}</span>
            </div>
          ))
        )}
      </div>

      {isOwner ? (
        <div className="space-y-2 border-t border-white/10 pt-3">
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.address} className="tag border-white/15 bg-white/5 text-slate-300 hover:bg-white/10" onClick={() => void add(p.address)}>
                  + {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input className="field" placeholder="0x… dirección del token" value={addr} onChange={(e) => setAddr(e.target.value)} />
            <button className="btn-signal whitespace-nowrap" onClick={() => void add()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
          {msg && <p className={`text-xs ${msg.k === "err" ? "text-red-400" : "text-signal"}`}>{msg.t}</p>}
        </div>
      ) : (
        <p className="border-t border-white/10 pt-3 text-xs text-slate-500">
          {isConnected ? "Solo el owner del contrato puede agregar tokens." : "Conecta la wallet del owner para agregar tokens."}
        </p>
      )}
    </div>
  );
}
