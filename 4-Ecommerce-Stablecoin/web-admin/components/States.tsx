"use client";

import { Loader2, WalletMinimal, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { useWeb3 } from "@/contexts/Web3Context";

export function NeedsWallet({ children }: { children: ReactNode }) {
  const { isConnected } = useWeb3();
  if (isConnected) return <>{children}</>;
  return (
    <div className="panel-pad rise flex flex-col items-center gap-3 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-slate-400">
        <WalletMinimal className="h-6 w-6" />
      </div>
      <p className="font-display text-xl text-white">Conecta tu wallet</p>
      <p className="max-w-sm text-sm text-slate-400">
        Necesitas conectar MetaMask para administrar tu comercio.
      </p>
    </div>
  );
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="panel-pad flex flex-col items-center gap-2 py-14 text-center">
      <Inbox className="h-8 w-8 text-slate-500" />
      <p className="text-slate-300">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="panel h-16 animate-pulse bg-ink-800/50" />
      ))}
    </div>
  );
}
