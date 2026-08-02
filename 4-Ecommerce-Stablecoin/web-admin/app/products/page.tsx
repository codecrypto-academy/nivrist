"use client";

import { useState } from "react";
import { Plus, Package, Pencil, AlertCircle } from "lucide-react";
import { useAdmin } from "@/contexts/AdminDataContext";
import { NeedsWallet, Loading, EmptyState } from "@/components/States";
import CompanyRegistration from "@/components/CompanyRegistration";
import ProductForm from "@/components/ProductForm";
import { formatEurt } from "@/lib/config";
import type { Product } from "@/lib/contracts";

export default function ProductsPage() {
  const { myCompany, products, loading } = useAdmin();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <NeedsWallet>
      {loading && !myCompany ? (
        <Loading />
      ) : !myCompany ? (
        <CompanyRegistration />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl text-white">Productos</h1>
              <p className="text-sm text-slate-400">{products.length} en catálogo</p>
            </div>
            {!adding && !editing && (
              <button className="btn-primary" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> Nuevo producto
              </button>
            )}
          </div>

          {adding && <ProductForm companyId={myCompany.companyId} onClose={() => setAdding(false)} />}
          {editing && (
            <ProductForm companyId={myCompany.companyId} product={editing} onClose={() => setEditing(null)} />
          )}

          {products.length === 0 && !adding ? (
            <EmptyState title="Sin productos" hint="Añade tu primer producto para venderlo en la tienda." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <div key={p.productId} className="panel-pad rise flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-mint">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="line-clamp-1 text-xs text-slate-500">{p.description || "Sin descripción"}</p>
                      </div>
                    </div>
                    <span className={`chip ${p.isActive ? "bg-mint/15 text-mint-400" : "bg-white/5 text-slate-400"}`}>
                      {p.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="money text-lg">€{formatEurt(p.price)}</p>
                      <p className={`text-xs ${p.stock === 0 ? "text-red-400" : "text-slate-500"}`}>
                        {p.stock === 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Sin stock
                          </span>
                        ) : (
                          `Stock: ${p.stock}`
                        )}
                      </p>
                    </div>
                    <button className="btn-ghost !py-1.5" onClick={() => setEditing(p)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </NeedsWallet>
  );
}
