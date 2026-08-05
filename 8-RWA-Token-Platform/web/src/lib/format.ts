import { formatUnits } from "viem";

export function shortAddr(a?: string): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function fmtToken(value: bigint | undefined, decimals = 18, maxFrac = 4): string {
  if (value === undefined) return "—";
  const s = formatUnits(value, decimals);
  const [int, frac = ""] = s.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const f = frac.slice(0, maxFrac).replace(/0+$/, "");
  return f ? `${grouped}.${f}` : grouped;
}

/** parse a human amount string into base units; returns undefined if invalid */
export function parseAmount(s: string, decimals = 18): bigint | undefined {
  if (!s.trim()) return undefined;
  const [int, frac = ""] = s.trim().split(".");
  if (!/^\d*$/.test(int) || !/^\d*$/.test(frac)) return undefined;
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  try {
    return BigInt((int || "0") + padded);
  } catch {
    return undefined;
  }
}

export function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s.trim());
}
