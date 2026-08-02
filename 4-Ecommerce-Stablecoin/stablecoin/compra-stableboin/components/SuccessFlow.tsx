"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, AlertTriangle, Coins, ArrowRight } from "lucide-react";

interface ConfirmResult {
  paid: boolean;
  minted: boolean;
  wallet: string;
  amount: number;
  txHash?: string | null;
  note?: string;
}

export default function SuccessFlow() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = useCallback(async () => {
    if (!sessionId) {
      setError("Falta el identificador de sesión");
      setState("error");
      return;
    }
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo confirmar el pago");
      setResult(data);
      setState("ok");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }, [sessionId]);

  useEffect(() => {
    void confirm();
  }, [confirm]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-ink/60">
        <Loader2 className="h-5 w-5 animate-spin" /> Acreditando tus EURT…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="card-white p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-coral" />
        <p className="mt-3 font-display text-xl font-bold">No se pudo confirmar</p>
        <p className="mt-1 text-sm text-ink/60">{error}</p>
        <button className="btn-outline mt-4" onClick={() => void confirm()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="card-white overflow-hidden text-center">
      <div className="border-b-2 border-ink bg-grass px-6 py-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-ink" />
        <p className="mt-2 font-display text-3xl font-extrabold text-ink">¡Compra completada!</p>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-center gap-2">
          <Coins className="h-6 w-6 text-violet" />
          <span className="price text-4xl text-violet">+{result?.amount} EURT</span>
        </div>
        <p className="text-sm text-ink/60">
          {result?.minted ? "acreditados en tu wallet" : result?.note ?? "ya estaban acreditados"}
        </p>
        {result?.wallet && (
          <p className="mono break-all text-xs text-ink/50">→ {result.wallet}</p>
        )}
        {result?.txHash && (
          <p className="mono break-all text-xs text-ink/40">tx {result.txHash}</p>
        )}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-outline">
            Comprar más
          </Link>
          <a href="http://localhost:6004" className="btn-violet">
            Ir a la tienda <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
