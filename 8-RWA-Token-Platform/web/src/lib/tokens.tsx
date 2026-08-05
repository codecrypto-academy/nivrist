"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";
import { addresses } from "@/config/addresses";

export interface IssuedToken {
  address: Address;
  name: string;
  symbol: string;
  aggregator: Address;
  modules: number;
}

interface TokensCtx {
  tokens: IssuedToken[];
  add: (t: IssuedToken) => void;
  selected?: Address;
  select: (a: Address) => void;
  current?: IssuedToken;
}

const C = createContext<TokensCtx | null>(null);
const KEY = "rwa_tokens";

const DEMO: IssuedToken = {
  address: addresses.demoToken,
  name: "Demo Security Token",
  symbol: "DEMO",
  aggregator: "0x0000000000000000000000000000000000000000",
  modules: 2,
};

export function TokensProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<IssuedToken[]>([DEMO]);
  const [selected, setSelected] = useState<Address | undefined>(addresses.demoToken);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as IssuedToken[];
        const merged = [DEMO, ...saved.filter((t) => t.address !== DEMO.address)];
        setTokens(merged);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (list: IssuedToken[]) => {
    localStorage.setItem(KEY, JSON.stringify(list.filter((t) => t.address !== DEMO.address)));
  };

  const add = (t: IssuedToken) => {
    setTokens((prev) => {
      const next = [...prev.filter((x) => x.address !== t.address), t];
      persist(next);
      return next;
    });
    setSelected(t.address);
  };

  const value = useMemo<TokensCtx>(
    () => ({
      tokens,
      add,
      selected,
      select: setSelected,
      current: tokens.find((t) => t.address === selected),
    }),
    [tokens, selected],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useTokens(): TokensCtx {
  const c = useContext(C);
  if (!c) throw new Error("useTokens within TokensProvider");
  return c;
}
