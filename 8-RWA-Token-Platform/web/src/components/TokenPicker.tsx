"use client";

import type { Address } from "viem";
import type { IssuedToken } from "@/lib/tokens";
import { shortAddr } from "@/lib/format";

/** Compact selector for tabs scoped to a token kind (Dividends / Governance). */
export function TokenPicker({
  list,
  selected,
  onSelect,
}: {
  list: IssuedToken[];
  selected?: Address;
  onSelect: (a: Address) => void;
}) {
  if (list.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((tok) => {
        const active = tok.address === selected;
        return (
          <button
            key={tok.address}
            onClick={() => onSelect(tok.address)}
            className={`inline-flex items-center gap-2 border px-3 py-2 text-[12px] transition-colors ${
              active
                ? "border-gold bg-gold/10 text-gold"
                : "border-ink-500 text-parchment-faint hover:text-parchment-dim"
            }`}
          >
            <span className="font-display text-[13px]">{tok.symbol}</span>
            <span className="font-mono text-[10px] opacity-70">{shortAddr(tok.address)}</span>
          </button>
        );
      })}
    </div>
  );
}
