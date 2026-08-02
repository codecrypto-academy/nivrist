import { Suspense } from "react";
import { Lock, Loader2 } from "lucide-react";
import PaymentFlow from "@/components/PaymentFlow";

export default function PayPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-violet text-white shadow-hard-sm">
          <Lock className="h-5 w-5" />
        </div>
        <span className="font-display text-xl font-extrabold tracking-tight">
          EuroChain<span className="text-violet"> Pay</span>
        </span>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-16 text-ink/60">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
          </div>
        }
      >
        <PaymentFlow />
      </Suspense>

      <p className="mt-6 text-center text-xs text-ink/50">
        Pago seguro on-chain · el importe se toma de la factura en el contrato.
      </p>
    </main>
  );
}
