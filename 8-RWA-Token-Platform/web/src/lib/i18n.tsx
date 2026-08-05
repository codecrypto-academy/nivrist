"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en";

const DICT = {
  brand: { es: "Bóveda RWA", en: "RWA Vault" },
  tagline: {
    es: "Emisión de security tokens permisionados · ERC-3643",
    en: "Permissioned security-token issuance · ERC-3643",
  },
  issuerConsole: { es: "Consola del emisor", en: "Issuer console" },

  // nav
  navOverview: { es: "Resumen", en: "Overview" },
  navOnboard: { es: "Alta KYC", en: "KYC Onboarding" },
  navIssue: { es: "Emitir token", en: "Issue token" },
  navCompliance: { es: "Compliance", en: "Compliance" },
  navOps: { es: "Operativa", en: "Operations" },

  // wallet
  connect: { es: "Conectar", en: "Connect" },
  disconnect: { es: "Desconectar", en: "Disconnect" },
  account: { es: "Cuenta", en: "Account" },
  notConnected: { es: "Sin conectar", en: "Not connected" },
  wrongChain: { es: "Cambia a Anvil (31337)", en: "Switch to Anvil (31337)" },
  connectToStart: {
    es: "Conecta una cuenta para operar la bóveda",
    en: "Connect an account to operate the vault",
  },

  // overview
  ovInfra: { es: "Infraestructura", en: "Infrastructure" },
  ovRegistry: { es: "Registro de identidades", en: "Identity registry" },
  ovTokenFactory: { es: "Fábrica de tokens", en: "Token factory" },
  ovPresetMgr: { es: "Gestor de presets", en: "Preset manager" },
  ovDemoToken: { es: "Token demo", en: "Demo token" },
  ovVerified: { es: "verificado", en: "verified" },
  ovUnverified: { es: "no verificado", en: "unverified" },
  ovYourStatus: { es: "Tu estado KYC", en: "Your KYC status" },
  ovDeployer: { es: "Deployer / owner", en: "Deployer / owner" },
  ovYouAreAgent: { es: "Eres agente", en: "You are agent" },
  ovYouAreNotAgent: { es: "No eres agente", en: "Not an agent" },

  // onboard
  onbTitle: { es: "Dar de alta un inversor", en: "Onboard an investor" },
  onbDesc: {
    es: "Crea su identidad on-chain, emite el claim KYC como issuer de confianza y regístralo en el registry.",
    en: "Create their on-chain identity, issue the KYC claim as a trusted issuer, and register them.",
  },
  onbWallet: { es: "Wallet del inversor", en: "Investor wallet" },
  onbCountry: { es: "País (ISO num.)", en: "Country (ISO num.)" },
  onbStep1: { es: "1 · Crear identidad", en: "1 · Create identity" },
  onbStep2: { es: "2 · Emitir claim KYC", en: "2 · Issue KYC claim" },
  onbStep3: { es: "3 · Registrar", en: "3 · Register" },
  onbRun: { es: "Ejecutar alta completa", en: "Run full onboarding" },
  onbDone: { es: "Inversor verificado ✓", en: "Investor verified ✓" },
  onbCheck: { es: "Comprobar verificación", en: "Check verification" },

  // issue
  issTitle: { es: "Emitir un security token", en: "Issue a security token" },
  issDesc: {
    es: "Clona un token ERC-3643 y cablea su compliance en una sola transacción.",
    en: "Clone an ERC-3643 token and wire its compliance in a single transaction.",
  },
  issName: { es: "Nombre", en: "Name" },
  issSymbol: { es: "Símbolo", en: "Symbol" },
  issDecimals: { es: "Decimales", en: "Decimals" },
  issMaxBalance: { es: "Balance máx. por wallet", en: "Max balance / wallet" },
  issMaxHolders: { es: "Máx. holders", en: "Max holders" },
  issLockup: { es: "Lock-up (días)", en: "Lock-up (days)" },
  issZeroHint: { es: "0 = sin límite", en: "0 = no limit" },
  issDeploy: { es: "Emitir token", en: "Issue token" },
  issDeployed: { es: "Token emitido", en: "Token issued" },
  issSelect: { es: "Seleccionar", en: "Select" },
  issYourTokens: { es: "Tokens emitidos", en: "Issued tokens" },
  issNoTokens: { es: "Aún no has emitido tokens", en: "No tokens issued yet" },
  issModules: { es: "módulos", en: "modules" },

  // compliance
  compTitle: { es: "Panel de compliance", en: "Compliance panel" },
  compDesc: {
    es: "Módulos activos del token seleccionado. Todos deben aprobar una transferencia.",
    en: "Active modules for the selected token. All must approve a transfer.",
  },
  compNoToken: {
    es: "Selecciona un token en «Emitir token» o usa el token demo.",
    en: "Select a token in “Issue token” or use the demo token.",
  },
  compModule: { es: "Módulo", en: "Module" },
  compRule: { es: "Regla", en: "Rule" },
  compAddress: { es: "Dirección", en: "Address" },
  compAggregator: { es: "Agregador", en: "Aggregator" },
  compActiveModules: { es: "Módulos activos", en: "Active modules" },

  // ops
  opsTitle: { es: "Operativa del token", en: "Token operations" },
  opsAgentOnly: {
    es: "Acciones de agente (owner del token). Con la cuenta deployer están habilitadas.",
    en: "Agent actions (token owner). Enabled with the deployer account.",
  },
  opsMint: { es: "Emitir (mint)", en: "Mint" },
  opsBurn: { es: "Quemar (burn)", en: "Burn" },
  opsTo: { es: "Destinatario", en: "To" },
  opsFrom: { es: "Desde", en: "From" },
  opsAmount: { es: "Cantidad", en: "Amount" },
  opsFreeze: { es: "Congelar", en: "Freeze" },
  opsUnfreeze: { es: "Descongelar", en: "Unfreeze" },
  opsPause: { es: "Pausar token", en: "Pause token" },
  opsUnpause: { es: "Despausar", en: "Unpause" },
  opsForced: { es: "Transferencia forzada", en: "Forced transfer" },
  opsTransfer: { es: "Transferir", en: "Transfer" },
  opsBalanceOf: { es: "Balance de", en: "Balance of" },
  opsPaused: { es: "En pausa", en: "Paused" },
  opsLive: { es: "Operativo", en: "Live" },
  opsSupply: { es: "Suministro", en: "Supply" },

  // shared
  address: { es: "Dirección", en: "Address" },
  processing: { es: "Procesando…", en: "Processing…" },
  copy: { es: "Copiar", en: "Copy" },
  copied: { es: "Copiado", en: "Copied" },
  txSent: { es: "Transacción enviada", en: "Transaction sent" },
  txError: { es: "Error en la transacción", en: "Transaction failed" },
  yes: { es: "Sí", en: "Yes" },
  no: { es: "No", en: "No" },
} as const;

type Key = keyof typeof DICT;

interface I18n {
  lang: Lang;
  toggle: () => void;
  t: (k: Key) => string;
}
const C = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");
  useEffect(() => {
    const s = localStorage.getItem("rwa_lang") as Lang | null;
    if (s === "es" || s === "en") setLang(s);
  }, []);
  const set = useCallback((l: Lang) => {
    localStorage.setItem("rwa_lang", l);
    setLang(l);
  }, []);
  const t = useCallback((k: Key) => DICT[k]?.[lang] ?? String(k), [lang]);
  const value = useMemo<I18n>(
    () => ({ lang, toggle: () => set(lang === "es" ? "en" : "es"), t }),
    [lang, set, t],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useT(): I18n {
  const c = useContext(C);
  if (!c) throw new Error("useT within I18nProvider");
  return c;
}
