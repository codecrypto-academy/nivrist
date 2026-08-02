"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Receipt, Store } from "lucide-react";
import WalletButton from "./WalletButton";
import { useStore } from "@/contexts/StoreContext";

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useStore();

  const links = [
    { href: "/", label: "Tienda", icon: Store },
    { href: "/orders", label: "Pedidos", icon: Receipt },
  ];

  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-violet text-white shadow-hard-sm">
            <Store className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">
            EuroChain<span className="text-violet">.market</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="mr-1 hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  pathname === href ? "text-violet" : "text-ink/60 hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>

          <Link href="/cart" className="relative">
            <span className="btn-coral">
              <ShoppingBag className="h-4 w-4" /> Carrito
            </span>
            {cartCount > 0 && (
              <span className="animate-pop absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-ink text-xs font-bold text-paper">
                {cartCount}
              </span>
            )}
          </Link>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}
