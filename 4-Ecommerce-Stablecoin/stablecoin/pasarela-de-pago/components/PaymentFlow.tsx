"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Store,
  Receipt,
  Calendar,
  Wallet,
  ArrowRight,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { ecommerce, euroToken, readProvider, toInvoice, type Invoice } from "@/lib/contracts";
import { ECOMMERCE_ADDRESS, formatEurt, shortAddr } from "@/lib/config";
import WalletButton from "./WalletButton";

const COMPRA_URL = process.env.NEXT_PUBLIC_COMPRA_URL || "http://localhost:6001";

type Step = "idle" | "approving" | "paying" | "done";

export default function PaymentFlow() {
  const params = useSearchParams();
  const { account, isConnected, isCorrectNetwork, getSigner } = useWeb3();

  const invoiceId = params.get("invoice");
  const merchantParam = params.get("merchant_address") ?? "";
  const dateParam = params.get("date") ?? "";
  const redirect = params.get("redirect") ?? "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const shop = ecommerce(readProvider());
      const inv = toInvoice(await shop.getInvoice(BigInt(invoiceId)));
      setInvoice(inv);
      if (inv.isPaid) setStep("done");
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  useEffect(() => {
    async function loadBalance() {
      if (!account) return setBalance(0n);
      try {
        setBalance(await euroToken(readProvider()).balanceOf(account));
      } catch {
        setBalance(0n);
      }
    }
    void loadBalance();
  }, [account, step]);

  const total = invoice?.totalAmount ?? 0n;
  const insufficient = isConnected && balance < total;

  async function pay() {
    if (!invoice || !account) return;
    setError(null);
    try {
      const signer = await getSigner();
      const token = euroToken(signer);
      const shop = ecommerce(signer);

      // 1) Approve if the current allowance is not enough.
      const allowance: bigint = await token.allowance(account, ECOMMERCE_ADDRESS);
      if (allowance < total) {
        setStep("approving");
        const txA = await token.approve(ECOMMERCE_ADDRESS, total);
        await txA.wait();
      }

      // 2) Pay the invoice.
      setStep("paying");
      const txP = await shop.processPayment(BigInt(invoice.invoiceId));
      await txP.wait();

      setStep("done");
      await loadInvoice();

      // Redirect back to the store after a short confirmation.
      if (redirect) setTimeout(() => (window.location.href = redirect), 2500);
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
      setStep("idle");
    }
  }

  // ---- render ----
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-ink/60">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando factura…
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="card-white p-8 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-coral" />
        <p className="mt-3 font-display text-xl font-bold">Factura no encontrada</p>
        <p className="mt-1 text-sm text-ink/60">El enlace de pago no es válido o le faltan parámetros.</p>
      </div>
    );
  }

  const paid = invoice.isPaid || step === "done";

  return (
    <div className="card-white overflow-hidden">
      {/* Amount header */}
      <div className="border-b-2 border-ink bg-violet px-6 py-8 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Importe a pagar</p>
        <p className="price mt-1 text-6xl">€{formatEurt(total)}</p>
        <p className="mt-1 text-sm text-white/70">
          {formatEurt(total)} EURT · factura #{invoice.invoiceId}
        </p>
      </div>

      <div className="space-y-4 p-6">
        {/* details */}
        <div className="space-y-2 text-sm">
          <Row icon={Store} label="Comercio">
            <span className="mono">{shortAddr(merchantParam || invoice.customerAddress)}</span>
          </Row>
          <Row icon={Receipt} label="Factura">
            #{invoice.invoiceId}
          </Row>
          {dateParam && (
            <Row icon={Calendar} label="Fecha">
              {dateParam}
            </Row>
          )}
          {isConnected && (
            <Row icon={Wallet} label="Tu saldo">
              <span className={insufficient ? "font-bold text-coral" : "font-bold"}>€{formatEurt(balance)}</span>
            </Row>
          )}
        </div>

        {/* states */}
        {paid ? (
          <div className="rounded-xl border-2 border-ink bg-grass p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-ink" />
            <p className="mt-1 font-display text-lg font-bold">¡Pago completado!</p>
            <p className="text-sm text-ink/70">
              {redirect ? "Redirigiendo a la tienda…" : "La factura ha sido pagada."}
            </p>
            {redirect && (
              <a href={redirect} className="btn-ink mt-3">
                Volver a la tienda <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        ) : !isConnected ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-ink/60">Conecta tu wallet para pagar con EURT.</p>
            <div className="flex justify-center">
              <WalletButton />
            </div>
          </div>
        ) : !isCorrectNetwork ? (
          <div className="rounded-xl border-2 border-ink bg-coral p-4 text-center text-sm font-bold">
            Cambia MetaMask a la red local (chainId 31337) para continuar.
          </div>
        ) : insufficient ? (
          <div className="space-y-3 rounded-xl border-2 border-ink bg-coral/20 p-4 text-center">
            <p className="text-sm font-bold text-ink">Saldo insuficiente</p>
            <p className="text-xs text-ink/70">
              Necesitas €{formatEurt(total)} y tienes €{formatEurt(balance)}.
            </p>
            <a href={COMPRA_URL} className="btn-violet">
              <Coins className="h-4 w-4" /> Comprar EURT
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <p className="text-sm text-coral">{error}</p>}
            <button className="btn-violet w-full text-base" onClick={pay} disabled={step !== "idle"}>
              {step === "approving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Aprobando tokens…
                </>
              ) : step === "paying" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Procesando pago…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Pagar €{formatEurt(total)}
                </>
              )}
            </button>
            <p className="text-center text-xs text-ink/50">
              Aprobarás el gasto de EURT y luego se ejecutará el pago on-chain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Store;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-ink/15 pb-2">
      <span className="flex items-center gap-2 text-ink/60">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
