"use client";

import type { InvestorProfile, TokenMeta } from "./mongo";
export type { InvestorProfile, TokenMeta };

/**
 * Thin client for the off-chain API (MongoDB). Every call swallows errors and returns a safe
 * fallback so the on-chain dApp keeps working when Mongo is down (degraded mode).
 */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function mongoHealth(): Promise<boolean> {
  return safe(async () => {
    const r = await fetch("/api/health");
    const j = await r.json();
    return Boolean(j.mongo);
  }, false);
}

export async function getInvestor(wallet: string): Promise<InvestorProfile | null> {
  return safe(async () => {
    const r = await fetch(`/api/investors?wallet=${wallet.toLowerCase()}`);
    const j = await r.json();
    return (j.data as InvestorProfile) ?? null;
  }, null);
}

export async function saveInvestor(p: InvestorProfile): Promise<boolean> {
  return safe(async () => {
    const r = await fetch("/api/investors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p),
    });
    const j = await r.json();
    return Boolean(j.ok);
  }, false);
}

export async function getTokenMeta(address: string): Promise<TokenMeta | null> {
  return safe(async () => {
    const r = await fetch(`/api/tokens?address=${address.toLowerCase()}`);
    const j = await r.json();
    return (j.data as TokenMeta) ?? null;
  }, null);
}

export async function getAllTokenMeta(): Promise<TokenMeta[]> {
  return safe(async () => {
    const r = await fetch("/api/tokens");
    const j = await r.json();
    return (j.data as TokenMeta[]) ?? [];
  }, []);
}

export async function saveTokenMeta(m: TokenMeta): Promise<boolean> {
  return safe(async () => {
    const r = await fetch("/api/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(m),
    });
    const j = await r.json();
    return Boolean(j.ok);
  }, false);
}
