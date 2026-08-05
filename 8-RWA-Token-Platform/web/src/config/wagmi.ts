import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected, mock } from "wagmi/connectors";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");

/** Anvil local chain / cadena local de anvil. */
export const anvil = defineChain({
  id: CHAIN_ID,
  name: "Anvil (local)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

/**
 * Anvil unlocks its default dev accounts, so `eth_sendTransaction` from them is
 * signed by the node — no private key needed in the browser. The `mock` connector
 * lets us demo the full dApp without MetaMask. `injected` stays available for real wallets.
 *
 * Anvil desbloquea sus cuentas dev, así que `eth_sendTransaction` la firma el nodo —
 * sin private key en el navegador. El connector `mock` permite demostrar la dApp sin
 * MetaMask. `injected` queda disponible para wallets reales.
 */
export const ANVIL_ACCOUNTS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // #0 — deployer / owner / agent / issuer
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // #1 — inversor demo verificado
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // #2
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // #3
] as const;

/** Reorder so the account chosen in the UI (persisted) becomes mock accounts[0] = active. */
function orderedAccounts(): readonly `0x${string}`[] {
  if (typeof window === "undefined") return ANVIL_ACCOUNTS;
  const idx = Number(window.localStorage.getItem("rwa_mock_account") ?? "0");
  if (!idx || idx < 0 || idx >= ANVIL_ACCOUNTS.length) return ANVIL_ACCOUNTS;
  const rest = ANVIL_ACCOUNTS.filter((_, i) => i !== idx);
  return [ANVIL_ACCOUNTS[idx], ...rest];
}

export const config = createConfig({
  chains: [anvil],
  connectors: [
    mock({ accounts: orderedAccounts() as [`0x${string}`, ...`0x${string}`[]], features: {} }),
    injected({ shimDisconnect: true }),
  ],
  transports: { [anvil.id]: http(RPC_URL) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
