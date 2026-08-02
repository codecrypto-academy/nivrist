"use client";

import Link from "next/link";
import { Package, ReceiptText, Users, Coins, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useAdmin } from "@/contexts/AdminDataContext";
import { NeedsWallet, Loading } from "@/components/States";
import CompanyRegistration from "@/components/CompanyRegistration";
import { formatEurt, shortAddr } from "@/lib/config";

export default function Dashboard() {
  const { myCompany, products, invoices, customers, euroBalance, loading } = useAdmin();

  return (
    <NeedsWallet>
      {loading && !myCompany ? (
        <Loading label="Cargando tu comercio…" />
      ) : !myCompany ? (
        <CompanyRegistration />
      ) : (
        <DashboardContent />
      )}
    </NeedsWallet>
  );

  function DashboardContent() {
    const paid = invoices.filter((i) => i.isPaid).length;
    const pending = invoices.length - paid;
    const activeProducts = products.filter((p) => p.isActive).length;

    const stats = [
      { label: "Productos", value: `${activeProducts}/${products.length}`, icon: Package, href: "/products", sub: "activos" },
      { label: "Facturas", value: String(invoices.length), icon: ReceiptText, href: "/invoices", sub: `${paid} pagadas · ${pending} pendientes` },
      { label: "Clientes", value: String(customers.length), icon: Users, href: "/customers", sub: "únicos" },
      { label: "Ingresos", value: `€${formatEurt(euroBalance)}`, icon: Coins, href: "/invoices", sub: "EURT recibidos", gold: true },
    ];

    return (
      <div className="space-y-8">
        <div className="rise">
          <p className="text-xs uppercase tracking-widest text-mint-400">Comercio</p>
          <h1 className="font-display text-4xl text-white">{myCompany!.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            <span className="chip bg-white/5 text-slate-300">
              <ShieldCheck className="h-3 w-3 text-mint" /> Activo
            </span>
            <span className="mono">{shortAddr(myCompany!.companyAddress)}</span>
            {myCompany!.taxId && <span>· {myCompany!.taxId}</span>}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Link
              key={s.label}
              href={s.href}
              className="panel-pad rise group relative overflow-hidden transition hover:border-mint/30"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <s.icon className={`h-5 w-5 ${s.gold ? "text-gold" : "text-mint"}`} />
                <ArrowUpRight className="h-4 w-4 text-slate-600 transition group-hover:text-slate-300" />
              </div>
              <p className={`mt-4 font-display text-3xl ${s.gold ? "text-gold" : "text-white"}`}>{s.value}</p>
              <p className="text-sm text-slate-300">{s.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
            </Link>
          ))}
        </div>

        <div className="panel-pad rise">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Facturas recientes</h2>
            <Link href="/invoices" className="text-sm text-mint-400 hover:underline">
              Ver todas
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Aún no hay facturas.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {[...invoices].reverse().slice(0, 5).map((inv) => (
                <div key={inv.invoiceId} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm text-slate-200">Factura #{inv.invoiceId}</p>
                    <p className="mono text-slate-500">{shortAddr(inv.customerAddress)}</p>
                  </div>
                  <div className="text-right">
                    <p className="money">€{formatEurt(inv.totalAmount)}</p>
                    <span
                      className={`chip ${inv.isPaid ? "bg-mint/15 text-mint-400" : "bg-amber-500/15 text-amber-300"}`}
                    >
                      {inv.isPaid ? "Pagada" : "Pendiente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}
