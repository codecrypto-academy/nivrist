"use client";

import { Users, User } from "lucide-react";
import { useAdmin } from "@/contexts/AdminDataContext";
import { NeedsWallet, Loading, EmptyState } from "@/components/States";
import CompanyRegistration from "@/components/CompanyRegistration";
import { formatEurt, shortAddr } from "@/lib/config";

export default function CustomersPage() {
  const { myCompany, invoices, customers, loading } = useAdmin();

  // Purchase summary per customer.
  const summary = customers.map((addr) => {
    const theirs = invoices.filter((i) => i.customerAddress === addr);
    const spent = theirs.filter((i) => i.isPaid).reduce((acc, i) => acc + i.totalAmount, 0n);
    return { addr, count: theirs.length, spent };
  });

  return (
    <NeedsWallet>
      {loading && !myCompany ? (
        <Loading />
      ) : !myCompany ? (
        <CompanyRegistration />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl text-white">Clientes</h1>
            <p className="text-sm text-slate-400">Compradores de {myCompany.name}</p>
          </div>

          {summary.length === 0 ? (
            <EmptyState title="Aún no tienes clientes" hint="Aparecerán cuando alguien compre tus productos." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {summary.map((c) => (
                <div key={c.addr} className="panel-pad rise flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-white/5 text-slate-300">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="mono text-sm text-slate-200">{shortAddr(c.addr)}</p>
                      <p className="text-xs text-slate-500">{c.count} factura(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="money">€{formatEurt(c.spent)}</p>
                    <p className="text-xs text-slate-500">gastado</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="panel-pad flex items-center gap-3 text-sm text-slate-400">
            <Users className="h-5 w-5 text-mint" />
            {customers.length} cliente(s) único(s) han comprado en tu tienda.
          </div>
        </div>
      )}
    </NeedsWallet>
  );
}
