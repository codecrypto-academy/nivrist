"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { RefreshCw, Loader2, Bug } from "lucide-react";
import { useEscrowStore } from "@/lib/store";
import { erc20, readProvider, ESCROW_ADDRESS } from "@/lib/contracts";

const ACCOUNTS = [
  { label: "Escrow", address: ESCROW_ADDRESS, highlight: true },
  { label: "Account #0", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", highlight: false },
  { label: "Account #1", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", highlight: false },
  { label: "Account #2", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", highlight: false },
];

interface Row {
  label: string;
  address: string;
  highlight: boolean;
  eth: string;
  tokens: { symbol: string; balance: string }[];
}

function fmt(v: bigint, dec = 18) {
  return Number(ethers.formatUnits(v, dec)).toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export default function BalanceDebug() {
  const { allowedTokens } = useEscrowStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const provider = readProvider();
      const out: Row[] = [];
      for (const acc of ACCOUNTS) {
        const eth = await provider.getBalance(acc.address);
        const tokens: { symbol: string; balance: string }[] = [];
        for (const t of allowedTokens) {
          try {
            const bal: bigint = await erc20(t.address, provider).balanceOf(acc.address);
            tokens.push({ symbol: t.symbol, balance: fmt(bal) });
          } catch {
            tokens.push({ symbol: t.symbol, balance: "—" });
          }
        }
        out.push({ ...acc, eth: fmt(eth), tokens });
      }
      setRows(out);
    } finally {
      setLoading(false);
    }
  }, [allowedTokens]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="panel-pad rise space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="card-title flex items-center gap-2">
          <Bug className="h-4 w-4" /> Debug de balances
        </h2>
        <button className="btn-ghost !px-2.5 !py-1.5" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.address}
            className={`rounded-lg border px-3 py-2 ${
              r.highlight ? "border-offer/40 bg-offer/[0.06]" : "border-white/10 bg-void-700/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${r.highlight ? "text-offer" : "text-slate-200"}`}>{r.label}</span>
              <span className="mono text-slate-500">{r.address.slice(0, 6)}…{r.address.slice(-4)}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
              <span>ETH: <span className="mono text-slate-200">{r.eth}</span></span>
              {r.tokens.map((t) => (
                <span key={t.symbol}>
                  {t.symbol}: <span className="mono text-slate-200">{t.balance}</span>
                </span>
              ))}
              {r.tokens.length === 0 && <span className="text-slate-600">sin tokens permitidos</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
