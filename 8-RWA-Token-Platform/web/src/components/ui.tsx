"use client";

import { useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
import { Check, Copy } from "lucide-react";
import { shortAddr } from "@/lib/format";

export function Panel({
  title,
  subtitle,
  index,
  children,
  accent,
}: {
  title?: string;
  subtitle?: string;
  index?: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={`relative border ${
        accent ? "border-gold/40" : "border-ink-500/70"
      } bg-ink-800/60 backdrop-blur-sm animate-rise`}
    >
      {(title || index) && (
        <header className="flex items-baseline gap-3 border-b border-ink-500/60 px-5 py-3.5">
          {index && (
            <span className="font-mono text-[11px] tracking-widest text-gold/70">{index}</span>
          )}
          <div className="flex-1">
            {title && (
              <h2 className="font-display text-lg leading-tight text-parchment">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] leading-snug text-parchment-faint">{subtitle}</p>
            )}
          </div>
        </header>
      )}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

type Variant = "gold" | "ghost" | "danger" | "sage";
export function Button({
  variant = "gold",
  loading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-gold select-none";
  const styles: Record<Variant, string> = {
    gold: "bg-gold text-ink hover:bg-gold-bright shadow-vault",
    sage: "bg-sage/90 text-ink hover:bg-sage",
    ghost: "border border-ink-500 text-parchment-dim hover:border-gold/50 hover:text-parchment",
    danger: "border border-rust/60 text-rust hover:bg-rust hover:text-ink",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? "…" : children}
    </button>
  );
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-parchment-faint">
          {label}
        </span>
        {hint && <span className="font-mono text-[10px] text-parchment-faint/70">{hint}</span>}
      </span>
      <input
        className="w-full border border-ink-500 bg-ink-700/80 px-3 py-2.5 text-[13px] text-parchment placeholder:text-parchment-faint/50 focus-gold"
        spellCheck={false}
        autoComplete="off"
        {...props}
      />
    </label>
  );
}

export function Addr({ value, label }: { value?: string; label?: string }) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="text-parchment-faint">—</span>;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="group inline-flex items-center gap-1.5 font-mono text-[12px] text-parchment-dim hover:text-gold"
      title={value}
    >
      {label && <span className="text-parchment-faint">{label}</span>}
      <span>{shortAddr(value)}</span>
      {done ? (
        <Check size={12} className="text-sage" />
      ) : (
        <Copy size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px]">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          ok ? "bg-sage animate-pulseGold" : "bg-rust"
        }`}
      />
      <span className={ok ? "text-sage" : "text-rust"}>{label}</span>
    </span>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border border-ink-500/60 bg-ink-700/40 px-4 py-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-parchment-faint">
        {label}
      </div>
      <div className="mt-1 font-mono text-[15px] tabnum text-parchment">{children}</div>
    </div>
  );
}

/** tiny toast */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const show = (text: string, kind: "ok" | "err" = "ok") => {
    setMsg({ text, kind });
    setTimeout(() => setMsg(null), 4000);
  };
  const node = msg ? (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border px-5 py-3 text-[13px] shadow-lift ${
        msg.kind === "ok"
          ? "border-sage/50 bg-ink-800 text-sage"
          : "border-rust/50 bg-ink-800 text-rust"
      }`}
    >
      {msg.text}
    </div>
  ) : null;
  return { show, node };
}
