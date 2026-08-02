"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CreditCard, Loader2, Coins, Wallet, ShieldCheck, Info } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import WalletButton from "@/components/WalletButton";
import { EUROTOKEN_ABI } from "@/lib/eurotoken.abi";
import { EUROTOKEN_ADDRESS, RPC_URL, formatEurt } from "@/lib/config";

const QUICK = [50, 100, 250, 500];

export default function BuyPage() {
  const { account, isConnected } = useWeb3();
  const [amount, setAmount] = useState("100");
  const [balance, setBalance] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("canceled")) setCanceled(true);
  }, []);

  useEffect(() => {
    async function load() {
      if (!account) return setBalance(0n);
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const token = new ethers.Contract(EUROTOKEN_ADDRESS, EUROTOKEN_ABI, provider);
        setBalance(await token.balanceOf(account));
      } catch {
        setBalance(0n);
      }
    }
    void load();
  }, [account]);

  async function buy() {
    setError(null);
    const eur = Number(amount);
    if (!Number.isFinite(eur) || eur < 1) return setError("Ingresa una cantidad válida (mínimo 1 €)");
    try {
      setBusy(true);
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: account, eurAmount: eur }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando la sesión de pago");
      window.location.href = data.url; // → Stripe Checkout
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-violet text-white shadow-hard-sm">
            <Coins className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">
            Comprar <span className="text-violet">EURT</span>
          </span>
        </div>
        <WalletButton />
      </div>

      <div className="card-white overflow-hidden">
        <div className="border-b-2 border-ink bg-violet px-6 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Tu saldo</p>
          <p className="price mt-0.5 text-4xl">€{formatEurt(balance)}</p>
          <p className="text-sm text-white/70">EuroToken · 1 EURT = 1 €</p>
        </div>

        <div className="space-y-5 p-6">
          {canceled && (
            <div className="rounded-xl border-2 border-ink bg-coral/20 p-3 text-sm font-medium text-ink">
              Pago cancelado. Puedes intentarlo de nuevo cuando quieras.
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-bold text-ink/70">¿Cuántos EURT quieres comprar?</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg font-bold text-ink/50">€</span>
                <input
                  className="field !pl-8 !text-lg !font-bold"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <span className="tag bg-ink text-paper">= {amount || 0} EURT</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className={`tag ${Number(amount) === q ? "bg-violet text-white" : "bg-paper text-ink hover:bg-white"}`}
                >
                  €{q}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          {!isConnected ? (
            <div className="space-y-2 text-center">
              <p className="flex items-center justify-center gap-1 text-sm text-ink/60">
                <Wallet className="h-4 w-4" /> Conecta tu wallet para recibir los tokens.
              </p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          ) : (
            <button className="btn-violet w-full text-base" onClick={buy} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {busy ? "Redirigiendo a Stripe…" : `Comprar ${amount || 0} EURT con tarjeta`}
            </button>
          )}

          <div className="flex items-start gap-2 rounded-xl border-2 border-dashed border-ink/20 p-3 text-xs text-ink/60">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Modo test de Stripe: usa la tarjeta <span className="mono font-bold">4242 4242 4242 4242</span>, cualquier
              fecha futura y CVC. Tras el pago, los EURT se acuñan a tu wallet automáticamente.
            </span>
          </div>
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1 text-center text-xs text-ink/50">
        <ShieldCheck className="h-3.5 w-3.5" /> Pago procesado por Stripe · los tokens se acuñan al confirmarse.
      </p>
    </main>
  );
}
