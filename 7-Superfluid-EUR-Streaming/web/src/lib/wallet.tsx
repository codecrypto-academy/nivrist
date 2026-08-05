"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ethers } from "ethers"; // ethers v5
import { CHAIN_ID } from "@/config/web3";

interface WalletCtx {
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getProvider: () => ethers.providers.Web3Provider | null;
  getSigner: () => ethers.Signer;
}
const C = createContext<WalletCtx | null>(null);

interface Eip1193 { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; on: (e: string, h: (...a: unknown[]) => void) => void; removeListener: (e: string, h: (...a: unknown[]) => void) => void; }
function injected(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    const eth = injected();
    return eth ? new ethers.providers.Web3Provider(eth, "any") : null;
  }, []);
  const getSigner = useCallback(() => {
    const p = getProvider();
    if (!p) throw new Error("MetaMask no está instalado");
    return p.getSigner();
  }, [getProvider]);

  const refreshChain = useCallback(async () => {
    const eth = injected();
    if (eth) setChainId(Number((await eth.request({ method: "eth_chainId" })) as string));
  }, []);

  const connect = useCallback(async () => {
    const eth = injected();
    if (!eth) return setError("MetaMask no está instalado");
    try {
      setError(null);
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accs[0] ?? null);
      await refreshChain();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [refreshChain]);

  const disconnect = useCallback(() => setAccount(null), []);

  useEffect(() => {
    const eth = injected();
    if (!eth) return;
    const onA = (...a: unknown[]) => setAccount((a[0] as string[])?.[0] ?? null);
    const onC = (...a: unknown[]) => setChainId(Number(a[0] as string));
    eth.on("accountsChanged", onA);
    eth.on("chainChanged", onC);
    // Auto-conectar (el PDF: "Conectar wallet automáticamente").
    eth.request({ method: "eth_accounts" }).then((r) => {
      const l = r as string[];
      if (l.length) { setAccount(l[0]); void refreshChain(); }
    }).catch(() => {});
    return () => { eth.removeListener("accountsChanged", onA); eth.removeListener("chainChanged", onC); };
  }, [refreshChain]);

  const value = useMemo<WalletCtx>(() => ({
    account, chainId, isConnected: account !== null, isCorrectNetwork: chainId === CHAIN_ID,
    error, connect, disconnect, getProvider, getSigner,
  }), [account, chainId, error, connect, disconnect, getProvider, getSigner]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useWallet(): WalletCtx {
  const c = useContext(C);
  if (!c) throw new Error("useWallet within WalletProvider");
  return c;
}
