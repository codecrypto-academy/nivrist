// Helpers de comunicación con el background y de storage. La UI NUNCA usa ethers:
// delega toda la criptografía al service worker vía chrome.runtime.sendMessage.

export function sendRPC(method: string, params: unknown[] = []): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "CODECRYPTO_RPC", method, params }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response) return reject(new Error("No response from background"));
      if (response.error) return reject(new Error(response.error));
      resolve(response.result);
    });
  });
}

export function storageGet<T = Record<string, unknown>>(keys: string[] | null): Promise<T> {
  return new Promise((res) => chrome.storage.local.get(keys, (r) => res(r as T)));
}
export function storageSet(obj: Record<string, unknown>): Promise<void> {
  return new Promise((res) => chrome.storage.local.set(obj, () => res()));
}
export function storageClear(): Promise<void> {
  return new Promise((res) => chrome.storage.local.clear(() => res()));
}

export const STORAGE_KEYS = {
  mnemonic: "codecrypto_mnemonic",
  accounts: "codecrypto_accounts",
  current: "codecrypto_current_account",
  chainId: "codecrypto_chain_id",
} as const;

export const NETWORKS: Record<string, string> = {
  "0x7a69": "Hardhat Local (31337)",
  "0xaa36a7": "Sepolia (11155111)",
};

export const TEST_MNEMONIC = "test test test test test test test test test test test junk";

export function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

/** Formatea un balance hex (wei) a ETH con 4 decimales. */
export function formatEth(hexWei: string): string {
  try {
    const wei = BigInt(hexWei);
    const int = wei / 10n ** 18n;
    const frac = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
    return `${int}.${frac}`;
  } catch {
    return "0.0000";
  }
}

/** ETH (string decimal) → wei hex. */
export function ethToWeiHex(eth: string): string {
  const [i, f = ""] = eth.trim().replace(",", ".").split(".");
  const wei = BigInt(i || "0") * 10n ** 18n + BigInt((f + "000000000000000000").slice(0, 18) || "0");
  return "0x" + wei.toString(16);
}
