// background.ts — SERVICE WORKER (MV3). Único lugar que usa ethers y toca el mnemonic.
// Deriva cuentas HD, consulta balances, y FIRMA transacciones / EIP-712 tras la aprobación
// del usuario. Coordina las colas de conexión (connect.html) y de firma (notification.html)
// y emite eventos accountsChanged / chainChanged a todas las pestañas.
import { ethers } from "ethers";

// --- storage keys ---
const K = {
  mnemonic: "codecrypto_mnemonic",
  accounts: "codecrypto_accounts",
  current: "codecrypto_current_account",
  chainId: "codecrypto_chain_id",
  pendingSign: "codecrypto_pending_request",
  pendingConnect: "codecrypto_connect_request",
  networks: "codecrypto_networks",
} as const;

const DEFAULT_CHAIN = "0x7a69"; // 31337 Hardhat/Anvil

type NetMap = Record<string, { rpcUrl: string; name: string }>;
const BUILTIN_NETWORKS: NetMap = {
  "0x7a69": { rpcUrl: "http://localhost:8545", name: "Hardhat Local" },
  "0xaa36a7": { rpcUrl: "https://rpc.sepolia.org", name: "Sepolia" },
};

// --- storage helpers ---
function get<T = Record<string, unknown>>(keys: string[] | null): Promise<T> {
  return new Promise((res) => chrome.storage.local.get(keys, (r) => res(r as T)));
}
function set(obj: Record<string, unknown>): Promise<void> {
  return new Promise((res) => chrome.storage.local.set(obj, () => res()));
}
function remove(key: string): Promise<void> {
  return new Promise((res) => chrome.storage.local.remove(key, () => res()));
}

async function getNetworks(): Promise<NetMap> {
  const r = await get<Record<string, NetMap>>([K.networks]);
  return { ...BUILTIN_NETWORKS, ...(r[K.networks] || {}) };
}
async function rpcUrlFor(chainId: string): Promise<string> {
  const nets = await getNetworks();
  return nets[chainId]?.rpcUrl || BUILTIN_NETWORKS[DEFAULT_CHAIN].rpcUrl;
}
async function currentChain(): Promise<string> {
  const r = await get<Record<string, string>>([K.chainId]);
  return r[K.chainId] || DEFAULT_CHAIN;
}
async function deriveWallet(index: number): Promise<ethers.HDNodeWallet> {
  const r = await get<Record<string, string>>([K.mnemonic]);
  const phrase = r[K.mnemonic];
  if (!phrase) throw new Error("Wallet not set up");
  const mnemonicObj = ethers.Mnemonic.fromPhrase(phrase);
  return ethers.HDNodeWallet.fromMnemonic(mnemonicObj, `m/44'/60'/0'/0/${index}`);
}

// ---------------------------------------------------------------------
// Colas de aprobación (firma) y conexión
// ---------------------------------------------------------------------
type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };
const pendingApprovals = new Map<number, Pending>();
const pendingConnections = new Map<number, Pending>();
let idCounter = 0;

function refreshBadge() {
  const n = pendingApprovals.size + pendingConnections.size;
  chrome.action.setBadgeText({ text: n > 0 ? String(n) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#c65d3b" });
}
function notify(title: string, message: string) {
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("vite.svg"),
      title,
      message,
    });
  } catch {
    /* notifications puede no estar disponible */
  }
}

async function openWindow(url: string, width: number, height: number) {
  return chrome.windows.create({ url: chrome.runtime.getURL(url), type: "popup", width, height });
}

// Pide al usuario elegir cuenta (abre connect.html).
async function requestUserConnection(
  origin: string,
  accounts: string[],
  currentIndex: number
): Promise<{ account: string; accountIndex: number }> {
  const requestId = ++idCounter;
  await set({ [K.pendingConnect]: { requestId, origin, accounts, currentAccountIndex: currentIndex } });
  await openWindow("connect.html", 420, 660);
  notify("CodeCrypto", `Solicitud de conexión de ${origin}`);
  return new Promise((resolve, reject) => {
    pendingConnections.set(requestId, { resolve: resolve as (v: unknown) => void, reject });
    refreshBadge();
    setTimeout(() => {
      if (pendingConnections.delete(requestId)) {
        refreshBadge();
        reject(new Error("Connection request timed out"));
      }
    }, 120000);
  });
}

// Pide aprobación del usuario para firmar (abre notification.html).
async function requestUserApproval(method: string, params: unknown[], chainId: string): Promise<void> {
  const approvalId = ++idCounter;
  await set({ [K.pendingSign]: { approvalId, method, params, chainId } });
  await openWindow("notification.html", 400, 640);
  notify("CodeCrypto", method === "eth_sendTransaction" ? "Confirmar transacción" : "Confirmar firma");
  await new Promise<void>((resolve, reject) => {
    pendingApprovals.set(approvalId, {
      resolve: () => resolve(),
      reject,
    });
    refreshBadge();
    setTimeout(() => {
      if (pendingApprovals.delete(approvalId)) {
        refreshBadge();
        reject(new Error("Approval request timed out"));
      }
    }, 180000);
  });
}

// ---------------------------------------------------------------------
// RPC handler
// ---------------------------------------------------------------------
async function handleRPCRequest(
  method: string,
  params: unknown[],
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (method) {
    case "wallet_deriveAccounts": {
      const [phrase, num] = params as [string, number];
      if (!ethers.Mnemonic.isValidMnemonic(phrase)) throw new Error("Invalid mnemonic phrase");
      const mnemonicObj = ethers.Mnemonic.fromPhrase(phrase);
      const out: string[] = [];
      for (let i = 0; i < (num || 5); i++) {
        out.push(ethers.HDNodeWallet.fromMnemonic(mnemonicObj, `m/44'/60'/0'/0/${i}`).address);
      }
      return out;
    }

    case "eth_accounts": {
      const r = await get<Record<string, string[] | string>>([K.accounts, K.current]);
      const accounts = (r[K.accounts] as string[]) || [];
      const idx = Number(r[K.current] || 0);
      return accounts.length ? [accounts[idx]] : [];
    }

    case "eth_requestAccounts": {
      const r = await get<Record<string, string[] | string>>([K.accounts, K.current]);
      const accounts = (r[K.accounts] as string[]) || [];
      if (!accounts.length) throw new Error("No accounts available. Please set up the wallet.");
      const origin = sender.tab?.url ? new URL(sender.tab.url).origin : "unknown";
      const { account } = await requestUserConnection(origin, accounts, Number(r[K.current] || 0));
      return [account];
    }

    case "eth_chainId":
      return currentChain();

    case "eth_getBalance": {
      const [address] = params as [string];
      const provider = new ethers.JsonRpcProvider(await rpcUrlFor(await currentChain()));
      const balance = await provider.getBalance(address);
      return "0x" + balance.toString(16);
    }

    case "eth_sendTransaction": {
      const chainId = await currentChain();
      await requestUserApproval(method, params, chainId); // lanza si el usuario rechaza
      const tx = (params as Array<Record<string, string>>)[0];
      const r = await get<Record<string, string>>([K.current]);
      const wallet = await deriveWallet(Number(r[K.current] || 0));
      const provider = new ethers.JsonRpcProvider(await rpcUrlFor(chainId));
      const signer = wallet.connect(provider);
      const fee = await provider.getFeeData();
      const resp = await signer.sendTransaction({
        to: tx.to,
        value: tx.value ?? "0x0",
        data: tx.data ?? "0x",
        maxFeePerGas: fee.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined,
      });
      return resp.hash;
    }

    case "eth_signTypedData_v4": {
      const chainId = await currentChain();
      await requestUserApproval(method, params, chainId);
      const [, json] = params as [string, string];
      const r = await get<Record<string, string>>([K.current]);
      const wallet = await deriveWallet(Number(r[K.current] || 0));
      const typed = JSON.parse(json);
      const types = { ...typed.types };
      delete types.EIP712Domain;
      return wallet.signTypedData(typed.domain, types, typed.message);
    }

    case "personal_sign": {
      const chainId = await currentChain();
      await requestUserApproval(method, params, chainId);
      const [message] = params as [string];
      const r = await get<Record<string, string>>([K.current]);
      const wallet = await deriveWallet(Number(r[K.current] || 0));
      return wallet.signMessage(ethers.getBytes(message));
    }

    case "wallet_switchEthereumChain": {
      const [{ chainId }] = params as [{ chainId: string }];
      const nets = await getNetworks();
      if (!nets[chainId]) throw new Error("Unrecognized chain. Add it first.");
      await set({ [K.chainId]: chainId });
      return null;
    }

    case "wallet_addEthereumChain": {
      const [{ chainId, chainName, rpcUrls }] = params as [
        { chainId: string; chainName: string; rpcUrls: string[] }
      ];
      const r = await get<Record<string, NetMap>>([K.networks]);
      const custom = r[K.networks] || {};
      custom[chainId] = { rpcUrl: rpcUrls[0], name: chainName };
      await set({ [K.networks]: custom });
      return null;
    }

    default:
      throw new Error(`Method not supported: ${method}`);
  }
}

// ---------------------------------------------------------------------
// Router de mensajes
// ---------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CODECRYPTO_RPC") {
    handleRPCRequest(message.method, message.params || [], sender)
      .then((result) => sendResponse({ result, error: null }))
      .catch((err: Error) => sendResponse({ result: null, error: err.message }));
    return true; // respuesta asíncrona
  }

  if (message?.type === "CONNECT_RESPONSE") {
    const p = pendingConnections.get(message.requestId);
    if (p) {
      pendingConnections.delete(message.requestId);
      refreshBadge();
      void remove(K.pendingConnect);
      message.success
        ? p.resolve({ account: message.account, accountIndex: message.accountIndex })
        : p.reject(new Error(message.error || "User rejected connection"));
    }
    return false;
  }

  if (message?.type === "SIGN_RESPONSE") {
    const p = pendingApprovals.get(message.approvalId);
    if (p) {
      pendingApprovals.delete(message.approvalId);
      refreshBadge();
      void remove(K.pendingSign);
      message.success ? p.resolve(true) : p.reject(new Error(message.error || "User rejected"));
    }
    return false;
  }

  return false;
});

// ---------------------------------------------------------------------
// Sincronización: cambios en storage → eventos a todas las pestañas
// ---------------------------------------------------------------------
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;

  if (changes[K.current]) {
    const r = await get<Record<string, string[]>>([K.accounts]);
    const accounts = r[K.accounts] || [];
    const idx = Number(changes[K.current].newValue || 0);
    broadcast("accountsChanged", accounts[idx] ? [accounts[idx]] : []);
  }
  if (changes[K.chainId]) {
    broadcast("chainChanged", changes[K.chainId].newValue);
  }
});

function broadcast(eventName: string, data: unknown) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) {
        chrome.tabs.sendMessage(tab.id, { type: "CODECRYPTO_EVENT", eventName, data }, () => {
          void chrome.runtime.lastError; // ignorar pestañas sin content-script
        });
      }
    }
  });
}
