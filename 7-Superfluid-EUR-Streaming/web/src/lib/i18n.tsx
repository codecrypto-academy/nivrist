"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

const DICT: Record<string, { es: string; en: string }> = {
  title: { es: "EUR Streaming", en: "EUR Streaming" },
  subtitle: { es: "Dinero que fluye en tiempo real con Superfluid", en: "Money flowing in real time with Superfluid" },
  connect: { es: "Conectar wallet", en: "Connect wallet" },
  wrongNetwork: { es: "Red incorrecta", en: "Wrong network" },
  balances: { es: "Balances", en: "Balances" },
  wrap: { es: "Envolver EUR → EURx", en: "Wrap EUR → EURx" },
  unwrap: { es: "Desenvolver EURx → EUR", en: "Unwrap EURx → EUR" },
  amount: { es: "Cantidad", en: "Amount" },
  upgrade: { es: "Upgrade", en: "Upgrade" },
  downgrade: { es: "Downgrade", en: "Downgrade" },
  streaming: { es: "Streaming", en: "Streaming" },
  recipient: { es: "Destinatario", en: "Recipient" },
  startStream: { es: "Iniciar stream (2000 EUR/mes)", en: "Start stream (2000 EUR/month)" },
  flowRate: { es: "Flow rate", en: "Flow rate" },
  active: { es: "Activo", en: "Active" },
  paused: { es: "Pausado", en: "Paused" },
  pause: { es: "Pausar", en: "Pause" },
  resume: { es: "Reanudar", en: "Resume" },
  netFlow: { es: "Flujo neto", en: "Net flow" },
  perMonth: { es: "/mes", en: "/month" },
  processing: { es: "Procesando…", en: "Processing…" },
  connectToStart: { es: "Conecta tu wallet para empezar", en: "Connect your wallet to get started" },
  notConfigured: { es: "Configura EUR/EURx en web/.env.local (ver README)", en: "Set EUR/EURx in web/.env.local (see README)" },
  liveBalance: { es: "Balance en vivo", en: "Live balance" },
};

interface I18n { lang: Lang; toggle: () => void; t: (k: keyof typeof DICT) => string; }
const C = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => {
    const s = localStorage.getItem("sf_lang") as Lang | null;
    if (s === "es" || s === "en") setLang(s);
  }, []);
  const set = useCallback((l: Lang) => { localStorage.setItem("sf_lang", l); setLang(l); }, []);
  const t = useCallback((k: keyof typeof DICT) => DICT[k]?.[lang] ?? String(k), [lang]);
  const value = useMemo<I18n>(() => ({ lang, toggle: () => set(lang === "es" ? "en" : "es"), t }), [lang, set, t]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useT(): I18n {
  const c = useContext(C);
  if (!c) throw new Error("useT within I18nProvider");
  return c;
}
