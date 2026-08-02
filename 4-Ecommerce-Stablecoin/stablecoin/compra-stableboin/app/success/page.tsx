import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SuccessFlow from "@/components/SuccessFlow";

export default function SuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-16 text-ink/60">
            <Loader2 className="h-5 w-5 animate-spin" /> Verificando pago…
          </div>
        }
      >
        <SuccessFlow />
      </Suspense>
    </main>
  );
}
