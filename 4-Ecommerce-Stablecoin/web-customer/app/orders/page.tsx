"use client";

import Link from "next/link";
import { Receipt, CheckCircle2, Clock, CreditCard, Store } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useStore } from "@/contexts/StoreContext";
import { formatEurt } from "@/lib/config";

const PASARELA_URL = process.env.NEXT_PUBLIC_PASARELA_URL || "http://localhost:6002";

export default function OrdersPage() {
  const { isConnected } = useWeb3();
  const { invoices, companyById } = useStore();

  function payLink(invoiceId: number, companyId: number, amount: bigint) {
    const company = companyById(companyId);
    const url = new URL(PASARELA_URL);
    url.searchParams.set("merchant_address", company?.companyAddress ?? "");
    url.searchParams.set("amount", formatEurt(amount));
    url.searchParams.set("invoice", String(invoiceId));
    url.searchParams.set("date", new Date().toISOString().slice(0, 10));
    if (typeof window !== "undefined") url.searchParams.set("redirect", `${window.location.origin}/orders`);
    return url.toString();
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
      <h1 className="mb-6 font-display text-4xl font-extrabold">Mis pedidos</h1>

      {!isConnected ? (
        <div className="card-white flex flex-col items-center gap-2 py-16 text-center">
          <Receipt className="h-8 w-8 text-ink/40" />
          <p className="font-display text-xl font-bold">Conecta tu wallet</p>
          <p className="text-sm text-ink/60">Verás aquí tus facturas y su estado.</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="card-white flex flex-col items-center gap-2 py-16 text-center">
          <Receipt className="h-8 w-8 text-ink/40" />
          <p className="font-display text-xl font-bold">Sin pedidos todavía</p>
          <Link href="/" className="btn-violet mt-2">
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {[...invoices].reverse().map((inv) => (
            <div key={inv.invoiceId} className="card-white animate-rise flex flex-wrap items-center gap-4 p-5">
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink ${
                  inv.isPaid ? "bg-grass" : "bg-coral"
                }`}
              >
                {inv.isPaid ? <CheckCircle2 className="h-6 w-6 text-ink" /> : <Clock className="h-6 w-6 text-ink" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">Factura #{inv.invoiceId}</p>
                <p className="flex items-center gap-1 text-xs text-ink/50">
                  <Store className="h-3 w-3" /> {companyById(inv.companyId)?.name ?? `Empresa #${inv.companyId}`}
                  {inv.timestamp > 0 && <> · {new Date(inv.timestamp * 1000).toLocaleDateString("es-ES")}</>}
                </p>
              </div>
              <div className="text-right">
                <p className="price text-2xl text-coral">€{formatEurt(inv.totalAmount)}</p>
                <span className={`tag ${inv.isPaid ? "bg-grass text-ink" : "bg-coral text-ink"}`}>
                  {inv.isPaid ? "Pagada" : "Pendiente"}
                </span>
              </div>
              {!inv.isPaid && (
                <a className="btn-violet w-full sm:w-auto" href={payLink(inv.invoiceId, inv.companyId, inv.totalAmount)}>
                  <CreditCard className="h-4 w-4" /> Pagar
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
