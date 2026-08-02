"use client";

import { useState } from "react";
import { Plus, Loader2, Check, PackageX } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useStore } from "@/contexts/StoreContext";
import { formatEurt } from "@/lib/config";
import type { Product } from "@/lib/contracts";

// Deterministic accent per product so the grid feels lively but stable.
const ACCENTS = ["bg-violet text-white", "bg-coral text-ink", "bg-grass text-ink", "bg-ink text-paper"];

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const { isConnected } = useWeb3();
  const { addToCart, companyById } = useStore();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const company = companyById(product.companyId);
  const soldOut = product.stock === 0 || !product.isActive;
  const accent = ACCENTS[index % ACCENTS.length];

  async function add() {
    setError(null);
    try {
      setBusy(true);
      await addToCart(product.productId, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (e) {
      setError((e as Error).message.split("(")[0]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="card-white animate-rise flex flex-col overflow-hidden"
      style={{ animationDelay: `${(index % 8) * 55}ms` }}
    >
      {/* Poster block — bold color panel with the initial (no real images on-chain) */}
      <div className={`relative flex h-36 items-center justify-center border-b-2 border-ink ${accent}`}>
        <span className="font-display text-6xl font-extrabold opacity-90">
          {product.name.charAt(0).toUpperCase()}
        </span>
        {soldOut && (
          <span className="tag absolute right-3 top-3 bg-paper text-ink">
            <PackageX className="h-3 w-3" /> Agotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {company && <p className="text-[11px] font-bold uppercase tracking-wide text-ink/50">{company.name}</p>}
        <h3 className="font-display text-lg font-bold leading-tight">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink/60">{product.description || "—"}</p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <span className="price text-2xl text-coral">€{formatEurt(product.price)}</span>
            <p className="text-xs text-ink/50">{soldOut ? "sin stock" : `${product.stock} disponibles`}</p>
          </div>
          <button
            className={added ? "btn-ink" : "btn-violet"}
            onClick={add}
            disabled={!isConnected || soldOut || busy}
            title={!isConnected ? "Conecta tu wallet" : undefined}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : added ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {added ? "Añadido" : "Añadir"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-coral">{error}</p>}
      </div>
    </div>
  );
}
