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
import { CHAIN_ID } from "@/lib/config";

interface Web3ContextValue {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getProvider: () => ethers.BrowserProvider | null;
  getSigner: () => Promise<ethers.JsonRpcSigner>;
}

const Web3Context = createContext<Web3ContextValue | null>(null);

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

function getInjected(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback((): ethers.BrowserProvider | null => {
    const injected = getInjected();
    return injected ? new ethers.BrowserProvider(injected) : null;
  }, []);

  const getSigner = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error("MetaMask no está instalado");
    return provider.getSigner();
  }, [getProvider]);

  const refreshChain = useCallback(async () => {
    const injected = getInjected();
    if (!injected) return;
    const hex = (await injected.request({ method: "eth_chainId" })) as string;
    setChainId(Number(hex));
  }, []);

  const connect = useCallback(async () => {
    const injected = getInjected();
    if (!injected) {
      setError("MetaMask no está instalado. Instálalo para continuar.");
      return;
    }
    try {
      setConnecting(true);
      setError(null);
      const accounts = (await injected.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0] ?? null);
      await refreshChain();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, [refreshChain]);

  const disconnect = useCallback(() => setAccount(null), []);

  useEffect(() => {
    const injected = getInjected();
    if (!injected) return;
    const onAccounts = (...a: unknown[]) => setAccount((a[0] as string[])?.[0] ?? null);
    const onChain = (...a: unknown[]) => setChainId(Number(a[0] as string));
    injected.on("accountsChanged", onAccounts);
    injected.on("chainChanged", onChain);
    injected
      .request({ method: "eth_accounts" })
      .then((accs) => {
        const list = accs as string[];
        if (list.length > 0) {
          setAccount(list[0]);
          void refreshChain();
        }
      })
      .catch(() => {});
    return () => {
      injected.removeListener("accountsChanged", onAccounts);
      injected.removeListener("chainChanged", onChain);
    };
  }, [refreshChain]);

  const value = useMemo<Web3ContextValue>(
    () => ({
      account,
      chainId,
      isConnected: account !== null,
      isCorrectNetwork: chainId === CHAIN_ID,
      connecting,
      error,
      connect,
      disconnect,
      getProvider,
      getSigner,
    }),
    [account, chainId, connecting, error, connect, disconnect, getProvider, getSigner]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3(): Web3ContextValue {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within <Web3Provider>");
  return ctx;
}
