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

export type TokenKind = "base" | "realestate" | "equity";

export interface IssuedToken {
  address: Address;
  name: string;
  symbol: string;
  aggregator: Address;
  modules: number;
  kind: TokenKind;
}

interface TokensCtx {
  tokens: IssuedToken[];
  add: (t: IssuedToken) => void;
  selected?: Address;
  select: (a: Address) => void;
  current?: IssuedToken;
  byKind: (kind: TokenKind) => IssuedToken[];
}

const C = createContext<TokensCtx | null>(null);
const KEY = "rwa_tokens";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const DEMOS: IssuedToken[] = [
  { address: addresses.demoToken, name: "Demo Security Token", symbol: "DEMO", aggregator: ZERO, modules: 2, kind: "base" },
  { address: addresses.demoRealEstate, name: "Downtown Tower", symbol: "TOWER", aggregator: ZERO, modules: 0, kind: "realestate" },
  { address: addresses.demoEquity, name: "Acme Equity", symbol: "ACMEEQ", aggregator: ZERO, modules: 0, kind: "equity" },
];
const DEMO_ADDRS = new Set(DEMOS.map((d) => d.address.toLowerCase()));
const isDemo = (a: Address) => DEMO_ADDRS.has(a.toLowerCase());

export function TokensProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<IssuedToken[]>(DEMOS);
  const [selected, setSelected] = useState<Address | undefined>(addresses.demoToken);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = (JSON.parse(raw) as IssuedToken[]).filter((t) => !isDemo(t.address));
        setTokens([...DEMOS, ...saved]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (list: IssuedToken[]) => {
    localStorage.setItem(KEY, JSON.stringify(list.filter((t) => !isDemo(t.address))));
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
      byKind: (kind: TokenKind) => tokens.filter((t) => t.kind === kind),
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
