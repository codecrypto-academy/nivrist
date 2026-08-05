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
  navDividends: { es: "Dividendos", en: "Dividends" },
  navGovernance: { es: "Gobernanza", en: "Governance" },
  navMarket: { es: "Marketplace", en: "Marketplace" },

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
  ovTrustedIssuers: { es: "Trusted Issuers Registry", en: "Trusted Issuers Registry" },
  ovRegistry: { es: "Registro de identidades", en: "Identity registry" },
  ovTokenFactory: { es: "Fábrica de tokens", en: "Token factory" },
  ovMarketplace: { es: "Marketplace", en: "Marketplace" },
  ovPresetMgr: { es: "Gestor de presets", en: "Preset manager" },
  ovDemoToken: { es: "Token demo", en: "Demo token" },
  ovMongo: { es: "MongoDB (off-chain)", en: "MongoDB (off-chain)" },
  ovMongoUp: { es: "conectado", en: "connected" },
  ovMongoDown: { es: "no disponible", en: "unavailable" },
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
  onbName: { es: "Nombre", en: "Name" },
  onbEmail: { es: "Email", en: "Email" },
  onbOffchain: {
    es: "Nombre y email se guardan off-chain (MongoDB); solo el claim KYC va on-chain.",
    en: "Name and email are stored off-chain (MongoDB); only the KYC claim goes on-chain.",
  },
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
  issType: { es: "Tipo de token", en: "Token type" },
  issType_base: {
    es: "Security token ERC-3643 estándar.",
    en: "Standard ERC-3643 security token.",
  },
  issType_realestate: {
    es: "Inmobiliario: reparte rentas (dividendos en ETH) entre holders.",
    en: "Real estate: distributes rent (ETH dividends) to holders.",
  },
  issType_equity: {
    es: "Equity: gobernanza con voto ponderado por balance.",
    en: "Equity: governance with balance-weighted voting.",
  },
  issDescription: { es: "Descripción del activo", en: "Asset description" },
  issOffchain: { es: "off-chain (MongoDB)", en: "off-chain (MongoDB)" },
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

  // dividends (real estate)
  divTitle: { es: "Dividendos (renta inmobiliaria)", en: "Dividends (real-estate rent)" },
  divDesc: {
    es: "El agente deposita la renta (ETH) y cada holder reclama su parte proporcional al balance.",
    en: "The agent deposits rent (ETH) and each holder claims their share pro-rata to balance.",
  },
  divNoToken: {
    es: "No hay tokens Real Estate. Emite uno en «Emitir token» (tipo Real Estate).",
    en: "No Real Estate tokens. Issue one in “Issue token” (Real Estate type).",
  },
  divProperty: { es: "Referencia del inmueble", en: "Property reference" },
  divPot: { es: "Repartido acumulado", en: "Distributed to date" },
  divContractBal: { es: "ETH en el contrato", en: "ETH in contract" },
  divDeposit: { es: "Depositar renta (ETH)", en: "Deposit rent (ETH)" },
  divDepositBtn: { es: "Depositar", en: "Deposit" },
  divWithdrawable: { es: "Reclamable de", en: "Withdrawable of" },
  divClaim: { es: "Reclamar mis dividendos", en: "Claim my dividends" },
  divClaimed: { es: "Dividendos reclamados", en: "Dividends claimed" },
  divDeposited: { es: "Renta depositada", en: "Rent deposited" },
  divHolder: { es: "Holder", en: "Holder" },
  divBalance: { es: "Balance", en: "Balance" },
  divClaimable: { es: "Reclamable", en: "Claimable" },

  // governance (equity)
  govTitle: { es: "Gobernanza (equity)", en: "Governance (equity)" },
  govDesc: {
    es: "El agente abre propuestas; los holders votan con peso igual a su balance.",
    en: "The agent opens proposals; holders vote with weight equal to their balance.",
  },
  govNoToken: {
    es: "No hay tokens Equity. Emite uno en «Emitir token» (tipo Equity).",
    en: "No Equity tokens. Issue one in “Issue token” (Equity type).",
  },
  govNew: { es: "Nueva propuesta", en: "New proposal" },
  govDescription: { es: "Descripción", en: "Description" },
  govDuration: { es: "Duración (días)", en: "Duration (days)" },
  govCreate: { es: "Crear propuesta", en: "Create proposal" },
  govCreated: { es: "Propuesta creada", en: "Proposal created" },
  govProposals: { es: "Propuestas", en: "Proposals" },
  govNoProposals: { es: "Aún no hay propuestas", en: "No proposals yet" },
  govFor: { es: "A favor", en: "For" },
  govAgainst: { es: "En contra", en: "Against" },
  govVoteFor: { es: "Votar a favor", en: "Vote for" },
  govVoteAgainst: { es: "Votar en contra", en: "Vote against" },
  govExecute: { es: "Ejecutar", en: "Execute" },
  govVoted: { es: "Voto registrado", en: "Vote recorded" },
  govExecuted: { es: "Propuesta ejecutada", en: "Proposal executed" },
  govOpen: { es: "Abierta", en: "Open" },
  govClosed: { es: "Cerrada", en: "Closed" },
  govPassed: { es: "Aprobada", en: "Passed" },
  govRejected: { es: "Rechazada", en: "Rejected" },
  govEnds: { es: "Termina", en: "Ends" },
  govYourWeight: { es: "Tu poder de voto", en: "Your voting power" },

  // marketplace
  mktTitle: { es: "Mercado secundario", en: "Secondary market" },
  mktDesc: {
    es: "Publica órdenes de venta y compra tokens con ETH. La compra pasa por el compliance: solo un comprador verificado recibe los tokens.",
    en: "Post sell orders and buy tokens with ETH. The buy goes through compliance: only a verified buyer receives the tokens.",
  },
  mktSell: { es: "Vender", en: "Sell" },
  mktToken: { es: "Token", en: "Token" },
  mktAmount: { es: "Cantidad", en: "Amount" },
  mktPrice: { es: "Precio total (ETH)", en: "Total price (ETH)" },
  mktListBtn: { es: "Aprobar y publicar", en: "Approve & list" },
  mktSellHint: {
    es: "Son 2 transacciones: aprobar al marketplace y publicar la orden.",
    en: "Two transactions: approve the marketplace and post the order.",
  },
  mktListed: { es: "Orden publicada", en: "Order listed" },
  mktActive: { es: "Órdenes activas", en: "Active orders" },
  mktTotal: { es: "Órdenes totales", en: "Total orders" },
  mktListings: { es: "Órdenes en venta", en: "Open orders" },
  mktNoListings: { es: "No hay órdenes activas", en: "No active orders" },
  mktSeller: { es: "Vendedor", en: "Seller" },
  mktBuy: { es: "Comprar", en: "Buy" },
  mktBought: { es: "Compra realizada", en: "Purchase complete" },
  mktCancel: { es: "Cancelar", en: "Cancel" },
  mktCancelled: { es: "Orden cancelada", en: "Order cancelled" },

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
