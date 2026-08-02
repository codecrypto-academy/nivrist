"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { erc20, escrowContract, readProvider, type Operation } from "./contracts";

export interface TokenInfo {
  address: string;
  symbol: string;
}

interface StoreValue {
  owner: string | null;
  allowedTokens: TokenInfo[];
  operations: Operation[];
  loading: boolean;
  refresh: () => Promise<void>;
  symbolOf: (address: string) => string;
}

const Ctx = createContext<StoreValue | null>(null);

export function EscrowStoreProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<string | null>(null);
  const [allowedTokens, setAllowedTokens] = useState<TokenInfo[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const symbolCache = useRef<Map<string, string>>(new Map());

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const provider = readProvider();
      const escrow = escrowContract(provider);

      // Views default to empty on failure (e.g. contract not deployed yet).
      let tokenAddrs: string[] = [];
      let ops: Operation[] = [];
      try {
        tokenAddrs = await escrow.getAllowedTokens();
      } catch {
        tokenAddrs = [];
      }
      try {
        const raw = await escrow.getAllOperations();
        ops = (raw as Operation[]).map((o) => ({
          id: Number(o.id),
          creator: o.creator,
          tokenA: o.tokenA,
          tokenB: o.tokenB,
          amountA: o.amountA,
          amountB: o.amountB,
          active: o.active,
          completedBy: o.completedBy,
        }));
      } catch {
        ops = [];
      }
      try {
        setOwner(await escrow.owner());
      } catch {
        setOwner(null);
      }

      // Resolve symbols (cached).
      const infos: TokenInfo[] = [];
      for (const addr of tokenAddrs) {
        let sym = symbolCache.current.get(addr.toLowerCase());
        if (!sym) {
          try {
            sym = await erc20(addr, provider).symbol();
          } catch {
            sym = "???";
          }
          symbolCache.current.set(addr.toLowerCase(), sym!);
        }
        infos.push({ address: addr, symbol: sym! });
      }
      setAllowedTokens(infos);
      setOperations(ops);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000); // auto-refresh
    return () => clearInterval(t);
  }, [refresh]);

  const symbolOf = useCallback((address: string) => {
    return symbolCache.current.get(address.toLowerCase()) ?? `${address.slice(0, 6)}…`;
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ owner, allowedTokens, operations, loading, refresh, symbolOf }),
    [owner, allowedTokens, operations, loading, refresh, symbolOf]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEscrowStore(): StoreValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEscrowStore must be used within <EscrowStoreProvider>");
  return c;
}
