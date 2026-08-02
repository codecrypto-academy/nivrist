"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ReceiptText, Users, Building2 } from "lucide-react";
import type { ReactNode } from "react";
import WalletConnect from "./WalletConnect";
import { useAdmin } from "@/contexts/AdminDataContext";
import { formatEurt } from "@/lib/config";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/invoices", label: "Facturas", icon: ReceiptText },
  { href: "/customers", label: "Clientes", icon: Users },
];

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { myCompany, euroBalance } = useAdmin();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-ink-900/60 px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-ink-950">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg text-white">EuroChain</p>
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Admin</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-mint/10 text-mint-400 shadow-[inset_0_0_0_1px_rgba(62,230,165,0.2)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="panel-pad mt-4 !p-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Tesorería recibida</p>
          <p className="mt-1 font-display text-2xl text-gold">€{formatEurt(euroBalance)}</p>
          {myCompany && <p className="mt-1 truncate text-xs text-slate-400">{myCompany.name}</p>}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ink-950/70 px-6 py-4 backdrop-blur">
          <div className="md:hidden">
            <p className="font-display text-lg text-white">EuroChain Admin</p>
          </div>
          <div className="hidden md:block">
            <p className="text-sm text-slate-400">
              {myCompany ? (
                <>
                  Gestionando <span className="text-slate-200">{myCompany.name}</span>
                </>
              ) : (
                "Panel de comercios"
              )}
            </p>
          </div>
          <WalletConnect />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
