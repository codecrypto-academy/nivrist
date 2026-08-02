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
import { ethers } from "ethers";
import { CHAIN_ID } from "./contracts";

interface EthContext {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSigner: () => Promise<ethers.JsonRpcSigner>;
}

const Ctx = createContext<EthContext | null>(null);

interface Injected {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (e: string, h: (...args: unknown[]) => void) => void;
  removeListener: (e: string, h: (...args: unknown[]) => void) => void;
}

function injected(): Injected | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Injected }).ethereum ?? null;
}

export function EthereumProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSigner = useCallback(async () => {
    const eth = injected();
    if (!eth) throw new Error("MetaMask no está instalado");
    return new ethers.BrowserProvider(eth).getSigner();
  }, []);

  const refreshChain = useCallback(async () => {
    const eth = injected();
    if (!eth) return;
    setChainId(Number((await eth.request({ method: "eth_chainId" })) as string));
  }, []);

  const connect = useCallback(async () => {
    const eth = injected();
    if (!eth) return setError("MetaMask no está instalado.");
    try {
      setConnecting(true);
      setError(null);
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accs[0] ?? null);
      await refreshChain();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, [refreshChain]);

  const disconnect = useCallback(() => setAccount(null), []);

  // Auto-reconnect on load + react to account/chain changes.
  useEffect(() => {
    const eth = injected();
    if (!eth) return;
    const onAccounts = (...a: unknown[]) => setAccount((a[0] as string[])?.[0] ?? null);
    const onChain = (...a: unknown[]) => setChainId(Number(a[0] as string));
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    eth
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list.length) {
          setAccount(list[0]);
          void refreshChain();
        }
      })
      .catch(() => {});
    return () => {
      eth.removeListener("accountsChanged", onAccounts);
      eth.removeListener("chainChanged", onChain);
    };
  }, [refreshChain]);

  const value = useMemo<EthContext>(
    () => ({
      account,
      chainId,
      isConnected: account !== null,
      isCorrectNetwork: chainId === CHAIN_ID,
      connecting,
      error,
      connect,
      disconnect,
      getSigner,
    }),
    [account, chainId, connecting, error, connect, disconnect, getSigner]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEthereum(): EthContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEthereum must be used within <EthereumProvider>");
  return c;
}
