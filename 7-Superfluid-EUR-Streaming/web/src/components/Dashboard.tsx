"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { Waves, ArrowDownUp, Plus, Play, Pause, Wallet, Languages, AlertTriangle } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { useT } from "@/lib/i18n";
import {
  EUR_ADDRESS, EURX_ADDRESS, CHAIN_ID, FLOW_RATE_2000_EUR_MONTH,
  flowRateToEurPerMonth, shortAddr,
} from "@/config/web3";
import {
  getEurBalance, getEuroXBalanceWei, getNetFlow, getFlow,
  upgradeToEuroX, downgradeFromEuroX, createFlow, deleteFlow,
} from "@/lib/superfluid";

const CONFIGURED = EURX_ADDRESS !== "0x0000000000000000000000000000000000000000";

interface Recipient { address: string; flowRate: string } // flowRate="0" = pausado

export default function Dashboard() {
  const { account, isConnected, isCorrectNetwork, chainId, connect, getProvider, getSigner } = useWallet();
  const { t, lang, toggle } = useT();

  const [eurBal, setEurBal] = useState("0");
  const [eurxWei, setEurxWei] = useState<bigint>(0n);
  const [netFlow, setNetFlow] = useState<bigint>(0n);
  const [polledAt, setPolledAt] = useState(0);
  const [display, setDisplay] = useState("0.000000");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [amount, setAmount] = useState("100");
  const [newRecipient, setNewRecipient] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const ready = isConnected && isCorrectNetwork && CONFIGURED;

  const poll = useCallback(async () => {
    if (!ready || !account) return;
    const provider = getProvider();
    if (!provider) return;
    try {
      const [eur, xWei, net] = await Promise.all([
        getEurBalance(provider, account),
        getEuroXBalanceWei(provider, account),
        getNetFlow(provider, account),
      ]);
      setEurBal(eur);
      setEurxWei(BigInt(xWei));
      setNetFlow(BigInt(net));
      setPolledAt(Date.now());
      // refrescar el flowRate de cada destinatario
      const updated = await Promise.all(
        recipients.map(async (r) => {
          try {
            const f = await getFlow(provider, account, r.address);
            return { address: r.address, flowRate: f.flowRate };
          } catch {
            return r;
          }
        })
      );
      if (updated.length) setRecipients(updated);
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
    }
  }, [ready, account, getProvider, recipients]);

  // Cargar destinatarios guardados.
  useEffect(() => {
    const saved = localStorage.getItem("sf_recipients");
    if (saved) setRecipients(JSON.parse(saved).map((a: string) => ({ address: a, flowRate: "0" })));
  }, []);
  useEffect(() => {
    localStorage.setItem("sf_recipients", JSON.stringify(recipients.map((r) => r.address)));
  }, [recipients]);

  // Polling on-chain cada 5s.
  useEffect(() => {
    if (!ready) return;
    void poll();
    const id = setInterval(() => void poll(), 5000);
    return () => clearInterval(id);
  }, [ready, poll]);

  // Contador en vivo: interpola el balance entre polls usando el net flow.
  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - polledAt) / 1000;
      const projected = eurxWei + netFlow * BigInt(Math.max(0, Math.floor(elapsed)));
      // parte fraccional para movimiento suave
      const frac = netFlow * BigInt(Math.floor((elapsed % 1) * 1e6)) / 1_000_000n;
      const total = projected + frac;
      setDisplay(ethers.utils.formatEther(total < 0n ? 0n : total));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [eurxWei, netFlow, polledAt]);

  async function run(key: string, fn: () => Promise<void>) {
    setError(null);
    try { setBusy(key); await fn(); await poll(); }
    catch (e) { setError((e as Error).message.split("(")[0]); }
    finally { setBusy(null); }
  }

  const netEurPerMonth = flowRateToEurPerMonth(netFlow.toString());

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-fluid/30 bg-fluid/10 text-fluid">
            <Waves className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
            <p className="text-sm text-slate-400">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost !px-3" onClick={toggle}><Languages className="h-4 w-4" /> {lang.toUpperCase()}</button>
          {isConnected ? (
            <span className="pill bg-fluid/15 text-fluid"><span className="h-1.5 w-1.5 rounded-full bg-fluid" /> {shortAddr(account!)}</span>
          ) : (
            <button className="btn-fluid" onClick={() => void connect()}><Wallet className="h-4 w-4" /> {t("connect")}</button>
          )}
        </div>
      </header>

      {!CONFIGURED && (
        <div className="card-pad mb-6 flex items-center gap-3 text-sm text-amber-300">
          <AlertTriangle className="h-5 w-5" /> {t("notConfigured")}
        </div>
      )}
      {isConnected && !isCorrectNetwork && (
        <div className="card-pad mb-6 flex items-center gap-3 text-sm text-amber-300">
          <AlertTriangle className="h-5 w-5" /> {t("wrongNetwork")} ({chainId}) — {CHAIN_ID}
        </div>
      )}

      {!isConnected ? (
        <div className="card-pad rise py-16 text-center text-slate-400">{t("connectToStart")}</div>
      ) : (
        <div className="space-y-6">
          {/* Balance en vivo */}
          <div className="card-pad rise">
            <div className="flex items-center gap-2">
              <span className="live-dot h-2 w-2 rounded-full bg-fluid" />
              <span className="label !mb-0">{t("liveBalance")} EURx</span>
            </div>
            <div className="stream-balance mt-1 text-4xl font-bold text-white">{Number(display).toFixed(6)}</div>
            <div className="mt-1 text-sm text-slate-400">
              {t("netFlow")}: <span className={netEurPerMonth >= 0 ? "text-fluid" : "text-red-400"}>{netEurPerMonth.toFixed(2)} EUR{t("perMonth")}</span>
            </div>
          </div>

          {/* Wrap / Unwrap */}
          <div className="card-pad rise">
            <div className="mb-3 flex items-center gap-2 text-slate-300"><ArrowDownUp className="h-4 w-4" /> {t("wrap")} / {t("unwrap")}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="label">EUR</span><div className="stream-balance text-lg text-white">{Number(eurBal).toFixed(4)}</div></div>
              <div><span className="label">EURx</span><div className="stream-balance text-lg text-white">{Number(display).toFixed(4)}</div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <input className="field" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.0" />
              <button className="btn-fluid whitespace-nowrap" disabled={!ready || !!busy} onClick={() => run("up", () => upgradeToEuroX(getSigner(), amount))}>
                {busy === "up" ? t("processing") : t("upgrade")}
              </button>
              <button className="btn-ghost whitespace-nowrap" disabled={!ready || !!busy} onClick={() => run("down", () => downgradeFromEuroX(getSigner(), amount))}>
                {busy === "down" ? t("processing") : t("downgrade")}
              </button>
            </div>
          </div>

          {/* Streaming */}
          <div className="card-pad rise">
            <div className="mb-3 flex items-center gap-2 text-slate-300"><Waves className="h-4 w-4" /> {t("streaming")}</div>
            <div className="flex gap-2">
              <input className="field font-mono" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="0x… destinatario / recipient" />
              <button
                className="btn-ghost whitespace-nowrap"
                onClick={() => {
                  if (ethers.utils.isAddress(newRecipient) && !recipients.some((r) => r.address.toLowerCase() === newRecipient.toLowerCase())) {
                    setRecipients((p) => [...p, { address: newRecipient, flowRate: "0" }]);
                    setNewRecipient("");
                  }
                }}
              ><Plus className="h-4 w-4" /> {t("recipient")}</button>
            </div>

            <div className="mt-4 space-y-3">
              {recipients.length === 0 ? (
                <p className="text-sm text-slate-500">—</p>
              ) : (
                recipients.map((r) => {
                  const active = r.flowRate !== "0";
                  return (
                    <div key={r.address} className="flex items-center justify-between rounded-xl border border-white/10 bg-deep-700/50 p-3">
                      <div>
                        <div className="mono text-slate-200">{shortAddr(r.address)}</div>
                        <div className="text-xs text-slate-400">
                          {active ? <span className="text-fluid">{flowRateToEurPerMonth(r.flowRate).toFixed(0)} EUR{t("perMonth")}</span> : <span>{t("paused")}</span>}
                        </div>
                      </div>
                      {active ? (
                        <button className="btn-danger" disabled={!ready || !!busy} onClick={() => run(`del-${r.address}`, () => deleteFlow(getSigner(), r.address))}>
                          <Pause className="h-4 w-4" /> {t("pause")}
                        </button>
                      ) : (
                        <button className="btn-fluid" disabled={!ready || !!busy} onClick={() => run(`add-${r.address}`, () => createFlow(getSigner(), r.address, FLOW_RATE_2000_EUR_MONTH))}>
                          <Play className="h-4 w-4" /> {t("startStream")}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && <div className="card-pad text-sm text-red-400">{error}</div>}
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-slate-600">
        Superfluid · EUR {shortAddr(EUR_ADDRESS)} · EURx {shortAddr(EURX_ADDRESS)} · fork mainnet (chainId {CHAIN_ID})
      </footer>
    </main>
  );
}
