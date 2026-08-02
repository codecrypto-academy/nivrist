"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ethers } from "ethers";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
const MNEMONIC = process.env.NEXT_PUBLIC_MNEMONIC || "";

export interface AnvilWallet {
  index: number;
  address: string;
  privateKey: string;
}

interface WalletContextValue {
  provider: ethers.JsonRpcProvider;
  wallets: AnvilWallet[];
  account: string | null;
  walletIndex: number | null;
  isConnected: boolean;
  connect: (walletIndex?: number) => void;
  disconnect: () => void;
  switchWallet: (walletIndex: number) => void;
  /** Returns an ethers Signer for the connected wallet, ready to send txs. */
  getSigner: () => ethers.Wallet;
  /** Sign the 32-byte document hash (EIP-191 personal_sign). */
  signHash: (hash: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Derive Anvil's default HD wallets from the mnemonic, using the standard
 * Ethereum derivation path m/44'/60'/0'/0/i. No MetaMask required — this is a
 * pure local-dev setup driven by a JsonRpcProvider.
 */
function deriveWallets(mnemonic: string, count = 10): AnvilWallet[] {
  if (!mnemonic) return [];
  return Array.from({ length: count }, (_, i) => {
    const path = `m/44'/60'/0'/0/${i}`;
    const w = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);
    return { index: i, address: w.address, privateKey: w.privateKey };
  });
}

export function MetaMaskProvider({ children }: { children: ReactNode }) {
  const provider = useMemo(() => new ethers.JsonRpcProvider(RPC_URL), []);
  const wallets = useMemo(() => deriveWallets(MNEMONIC, 10), []);

  const [walletIndex, setWalletIndex] = useState<number | null>(null);

  // Restore the last selected wallet across reloads.
  useEffect(() => {
    const saved = window.localStorage.getItem("walletIndex");
    if (saved !== null) setWalletIndex(Number(saved));
  }, []);

  const connect = (index = 0) => {
    setWalletIndex(index);
    window.localStorage.setItem("walletIndex", String(index));
  };

  const disconnect = () => {
    setWalletIndex(null);
    window.localStorage.removeItem("walletIndex");
  };

  const switchWallet = (index: number) => {
    if (walletIndex === null) return;
    setWalletIndex(index);
    window.localStorage.setItem("walletIndex", String(index));
  };

  const getSigner = (): ethers.Wallet => {
    if (walletIndex === null) throw new Error("No wallet connected");
    const w = wallets[walletIndex];
    if (!w) throw new Error("Invalid wallet index");
    return new ethers.Wallet(w.privateKey, provider);
  };

  const signHash = async (hash: string): Promise<string> => {
    const signer = getSigner();
    // Sign the raw 32 bytes so the on-chain ECDSA.recover(toEthSignedMessageHash(hash))
    // matches. Passing the hex string instead would sign 66 UTF-8 chars — a classic bug.
    return signer.signMessage(ethers.getBytes(hash));
  };

  const account =
    walletIndex !== null ? wallets[walletIndex]?.address ?? null : null;

  const value: WalletContextValue = {
    provider,
    wallets,
    account,
    walletIndex,
    isConnected: walletIndex !== null,
    connect,
    disconnect,
    switchWallet,
    getSigner,
    signHash,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <MetaMaskProvider>");
  return ctx;
}
