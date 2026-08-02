"use client";

import { useMemo, useState } from "react";
import { ReceiptText, ExternalLink } from "lucide-react";
import { useAdmin } from "@/contexts/AdminDataContext";
import { NeedsWallet, Loading, EmptyState } from "@/components/States";
import CompanyRegistration from "@/components/CompanyRegistration";
import { formatEurt, shortAddr } from "@/lib/config";

type Filter = "all" | "paid" | "pending";

export default function InvoicesPage() {
  const { myCompany, invoices, loading } = useAdmin();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const list = [...invoices].reverse();
    if (filter === "paid") return list.filter((i) => i.isPaid);
    if (filter === "pending") return list.filter((i) => !i.isPaid);
    return list;
  }, [invoices, filter]);

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: `Todas (${invoices.length})` },
    { id: "paid", label: `Pagadas (${invoices.filter((i) => i.isPaid).length})` },
    { id: "pending", label: `Pendientes (${invoices.filter((i) => !i.isPaid).length})` },
  ];

  return (
    <NeedsWallet>
      {loading && !myCompany ? (
        <Loading />
      ) : !myCompany ? (
        <CompanyRegistration />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl text-white">Facturas</h1>
            <p className="text-sm text-slate-400">Pagos recibidos de tus clientes</p>
          </div>

          <div className="flex gap-1 rounded-xl border border-white/10 bg-ink-900/60 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                  filter === t.id ? "bg-mint/10 text-mint-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Sin facturas en esta vista" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-900/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((inv) => (
                    <tr key={inv.invoiceId} className="transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-400">#{inv.invoiceId}</td>
                      <td className="px-4 py-3">
                        <span className="mono text-slate-300">{shortAddr(inv.customerAddress)}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {inv.timestamp ? new Date(inv.timestamp * 1000).toLocaleString("es-ES") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="money">€{formatEurt(inv.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`chip ${inv.isPaid ? "bg-mint/15 text-mint-400" : "bg-amber-500/15 text-amber-300"}`}
                        >
                          {inv.isPaid ? "Pagada" : "Pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.isPaid && inv.paymentTxHash && inv.paymentTxHash !== "0x" + "0".repeat(64) ? (
                          <span className="mono inline-flex items-center gap-1 text-slate-500" title={inv.paymentTxHash}>
                            {inv.paymentTxHash.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </NeedsWallet>
  );
}
