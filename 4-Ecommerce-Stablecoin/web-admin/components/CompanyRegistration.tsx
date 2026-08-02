"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAdmin } from "@/contexts/AdminDataContext";
import { ecommerce } from "@/lib/contracts";

export default function CompanyRegistration() {
  const { isConnected, getSigner } = useWeb3();
  const { refresh } = useAdmin();
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register() {
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    try {
      setBusy(true);
      const shop = ecommerce(await getSigner());
      const tx = await shop.registerCompany(name.trim(), taxId.trim());
      await tx.wait();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-pad rise mx-auto max-w-lg text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-mint/10 text-mint">
        <Building2 className="h-7 w-7" />
      </div>
      <h2 className="font-display text-2xl text-white">Registra tu comercio</h2>
      <p className="mt-1 text-sm text-slate-400">
        Cada wallet puede registrar una empresa. Recibirás los pagos en EURT en esta dirección.
      </p>

      <div className="mt-6 space-y-4 text-left">
        <div>
          <label className="label">Nombre del comercio</label>
          <input className="field" placeholder="Mi Tienda" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Identificación fiscal (opcional)</label>
          <input className="field" placeholder="ES-B12345678" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" onClick={register} disabled={!isConnected || busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
          Registrar comercio
        </button>
        {!isConnected && <p className="text-center text-sm text-amber-400">Conecta tu wallet para registrar.</p>}
      </div>
    </div>
  );
}
