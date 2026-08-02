"use client";

import { useMemo, useState } from "react";
import { Sparkles, Store, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/contexts/StoreContext";
import ProductCard from "@/components/ProductCard";

export default function Catalog() {
  const { products, companies, loading, error } = useStore();
  const [companyFilter, setCompanyFilter] = useState<number | "all">("all");

  const visible = useMemo(
    () => products.filter((p) => (companyFilter === "all" ? true : p.companyId === companyFilter)),
    [products, companyFilter]
  );

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20">
      {/* Hero */}
      <section className="animate-rise relative my-8 overflow-hidden rounded-3xl border-2 border-ink bg-violet px-6 py-12 text-white shadow-hard-lg sm:px-12 sm:py-16">
        <div className="absolute -right-10 -top-10 h-48 w-48 rotate-12 rounded-3xl border-2 border-ink bg-coral/90" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full border-2 border-ink bg-grass/90" />
        <div className="relative max-w-2xl">
          <span className="tag bg-paper text-ink">
            <Sparkles className="h-3 w-3" /> Pagos con EuroToken
          </span>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] sm:text-7xl">
            Compra con
            <br />
            euros digitales.
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Un marketplace on-chain. Productos reales, pagados con la stablecoin{" "}
            <span className="font-bold text-paper">EURT</span> — sin intermediarios.
          </p>
          <a href="#catalogo" className="btn-coral mt-6">
            Ver catálogo <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Filters */}
      <section id="catalogo" className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-2 font-display text-2xl font-bold">Catálogo</span>
        <button
          onClick={() => setCompanyFilter("all")}
          className={`tag ${companyFilter === "all" ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-white"}`}
        >
          Todo
        </button>
        {companies.map((c) => (
          <button
            key={c.companyId}
            onClick={() => setCompanyFilter(c.companyId)}
            className={`tag ${companyFilter === c.companyId ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-white"}`}
          >
            <Store className="h-3 w-3" /> {c.name}
          </button>
        ))}
      </section>

      {error && <div className="card-white mb-6 p-4 text-sm text-coral">{error}</div>}

      {loading && products.length === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-white h-72 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card-white flex flex-col items-center gap-2 py-16 text-center">
          <Store className="h-8 w-8 text-ink/40" />
          <p className="font-display text-xl font-bold">Aún no hay productos</p>
          <p className="text-sm text-ink/60">
            Los comercios pueden crear productos en el{" "}
            <Link href="http://localhost:6003" className="font-bold text-violet underline">
              panel de administración
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p, i) => (
            <ProductCard key={p.productId} product={p} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
