"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, Loader2, ShoppingBag, CreditCard, ArrowLeft } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useStore } from "@/contexts/StoreContext";
import { ecommerce, readProvider, toInvoice } from "@/lib/contracts";
import { formatEurt } from "@/lib/config";

const PASARELA_URL = process.env.NEXT_PUBLIC_PASARELA_URL || "http://localhost:6002";

export default function CartPage() {
  const { isConnected, account, getSigner } = useWeb3();
  const { cart, productById, companyById, updateQty, refresh } = useStore();
  const [busyItem, setBusyItem] = useState<number | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = cart
    .map((l) => ({ ...l, product: productById(l.productId) }))
    .filter((l) => l.product);
  const total = lines.reduce((acc, l) => acc + (l.product!.price * BigInt(l.quantity)), 0n);

  async function changeQty(productId: number, qty: number) {
    setError(null);
    try {
      setBusyItem(productId);
      await updateQty(productId, Math.max(0, qty));
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
    } finally {
      setBusyItem(null);
    }
  }

  async function checkout() {
    if (!account) return;
    setError(null);
    try {
      setCheckingOut(true);
      const shop = ecommerce(await getSigner());
      // Group by company and create one invoice per company.
      const companyIds = [...new Set(lines.map((l) => l.product!.companyId))];
      let firstInvoiceId: number | null = null;
      for (const cid of companyIds) {
        const tx = await shop.createInvoice(cid);
        await tx.wait();
        if (firstInvoiceId === null) {
          const ids: bigint[] = await shop.getCustomerInvoices(account);
          firstInvoiceId = Number(ids[ids.length - 1]);
        }
      }
      await refresh();

      // Redirect to the payment gateway for the first invoice.
      if (firstInvoiceId !== null) {
        const reader = ecommerce(readProvider());
        const inv = toInvoice(await reader.getInvoice(firstInvoiceId));
        const company = companyById(inv.companyId);
        const url = new URL(PASARELA_URL);
        url.searchParams.set("merchant_address", company?.companyAddress ?? "");
        url.searchParams.set("amount", formatEurt(inv.totalAmount));
        url.searchParams.set("invoice", String(firstInvoiceId));
        url.searchParams.set("date", new Date().toISOString().slice(0, 10));
        url.searchParams.set("redirect", `${window.location.origin}/orders`);
        window.location.href = url.toString();
      }
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
      setCheckingOut(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-8">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Seguir comprando
      </Link>
      <h1 className="mb-6 font-display text-4xl font-extrabold">Tu carrito</h1>

      {!isConnected ? (
        <div className="card-white flex flex-col items-center gap-2 py-16 text-center">
          <ShoppingBag className="h-8 w-8 text-ink/40" />
          <p className="font-display text-xl font-bold">Conecta tu wallet</p>
          <p className="text-sm text-ink/60">Tu carrito vive on-chain, asociado a tu cuenta.</p>
        </div>
      ) : lines.length === 0 ? (
        <div className="card-white flex flex-col items-center gap-2 py-16 text-center">
          <ShoppingBag className="h-8 w-8 text-ink/40" />
          <p className="font-display text-xl font-bold">Carrito vacío</p>
          <Link href="/" className="btn-violet mt-2">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-3">
            {lines.map((l) => (
              <div key={l.productId} className="card-white flex items-center gap-4 p-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-ink bg-violet font-display text-2xl font-bold text-white">
                  {l.product!.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold">{l.product!.name}</p>
                  <p className="text-xs text-ink/50">{companyById(l.product!.companyId)?.name}</p>
                  <p className="price mt-0.5 text-coral">€{formatEurt(l.product!.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="btn-outline !px-2 !py-1.5"
                    onClick={() => changeQty(l.productId, l.quantity - 1)}
                    disabled={busyItem === l.productId}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold">
                    {busyItem === l.productId ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : l.quantity}
                  </span>
                  <button
                    className="btn-outline !px-2 !py-1.5"
                    onClick={() => changeQty(l.productId, l.quantity + 1)}
                    disabled={busyItem === l.productId}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="ml-1 grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-paper text-coral hover:bg-white"
                    onClick={() => changeQty(l.productId, 0)}
                    disabled={busyItem === l.productId}
                    title="Quitar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit lg:sticky lg:top-24">
            <div className="card p-5">
              <h2 className="font-display text-lg font-bold">Resumen</h2>
              <div className="my-4 flex items-baseline justify-between border-b-2 border-dashed border-ink/20 pb-4">
                <span className="text-ink/60">Total</span>
                <span className="price text-3xl">€{formatEurt(total)}</span>
              </div>
              <p className="mb-4 text-xs text-ink/50">
                El checkout crea la factura on-chain y te lleva a la pasarela para pagar con EURT.
              </p>
              {error && <p className="mb-3 text-xs text-coral">{error}</p>}
              <button className="btn-violet w-full" onClick={checkout} disabled={checkingOut}>
                {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {checkingOut ? "Creando factura…" : "Ir a pagar"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
