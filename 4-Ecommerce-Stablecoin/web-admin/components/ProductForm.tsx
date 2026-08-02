"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAdmin } from "@/contexts/AdminDataContext";
import { ecommerce, type Product } from "@/lib/contracts";
import { formatEurt, parseEurt } from "@/lib/config";

interface ProductFormProps {
  companyId: number;
  product?: Product; // present => edit mode
  onClose: () => void;
}

export default function ProductForm({ companyId, product, onClose }: ProductFormProps) {
  const editing = !!product;
  const { getSigner } = useWeb3();
  const { refresh } = useAdmin();

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? formatEurt(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [image, setImage] = useState(product?.ipfsImageHash ?? "");
  const [active, setActive] = useState(product?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("El nombre es obligatorio");
    let priceUnits: bigint;
    try {
      priceUnits = parseEurt(price);
    } catch {
      return setError("Precio inválido");
    }
    if (priceUnits <= 0n) return setError("El precio debe ser mayor a 0");
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) return setError("Stock inválido");

    try {
      setBusy(true);
      const shop = ecommerce(await getSigner());
      const tx = editing
        ? await shop.updateProduct(product!.productId, priceUnits, stockNum, active)
        : await shop.addProduct(companyId, name.trim(), description.trim(), priceUnits, stockNum, image.trim());
      await tx.wait();
      await refresh();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-pad rise space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-white">{editing ? `Editar ${product!.name}` : "Nuevo producto"}</h3>
        <button className="btn-ghost !px-2" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nombre</label>
          <input className="field" value={name} disabled={editing} onChange={(e) => setName(e.target.value)} />
          {editing && <p className="mt-1 text-xs text-slate-500">El nombre no se puede cambiar tras crear el producto.</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descripción</label>
          <input className="field" value={description} disabled={editing} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Precio (€)</label>
          <input className="field" inputMode="decimal" placeholder="10.00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label">Stock</label>
          <input className="field" inputMode="numeric" placeholder="100" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Imagen (IPFS hash o URL, opcional)</label>
          <input className="field" value={image} disabled={editing} onChange={(e) => setImage(e.target.value)} />
        </div>
        {editing && (
          <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-mint" />
            <span className="text-sm text-slate-300">Producto activo (visible en la tienda)</span>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </div>
  );
}
