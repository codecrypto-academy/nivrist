"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import {
  TokenAbi,
  ComplianceAggregatorAbi,
  MaxBalanceComplianceAbi,
  MaxHoldersComplianceAbi,
  LockupComplianceAbi,
} from "@/config/abis";
import { useT } from "@/lib/i18n";
import { useTokens } from "@/lib/tokens";
import { fmtToken } from "@/lib/format";
import { Panel, Addr, Stat } from "./ui";

interface ModuleInfo {
  address: Address;
  label: string;
  detail: string;
}

export function CompliancePanel() {
  const { t } = useT();
  const publicClient = usePublicClient();
  const { current } = useTokens();
  const [aggregator, setAggregator] = useState<Address>();
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicClient || !current) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const agg = (await publicClient.readContract({
          address: current.address,
          abi: TokenAbi,
          functionName: "compliance",
        })) as Address;
        if (cancelled) return;
        setAggregator(agg);

        const mods = (await publicClient.readContract({
          address: agg,
          abi: ComplianceAggregatorAbi,
          functionName: "modules",
        })) as Address[];

        const infos = await Promise.all(mods.map((m) => probe(publicClient, m)));
        if (!cancelled) setModules(infos);
      } catch {
        if (!cancelled) setModules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, current]);

  if (!current) {
    return (
      <Panel index="05" title={t("compTitle")}>
        <p className="py-4 text-[13px] text-parchment-faint">{t("compNoToken")}</p>
      </Panel>
    );
  }

  return (
    <Panel index="05" title={t("compTitle")} subtitle={t("compDesc")}>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={t("issSymbol")}>{current.symbol}</Stat>
        <Stat label={t("compActiveModules")}>{loading ? "…" : modules.length}</Stat>
        <div className="col-span-2 sm:col-span-1">
          <Stat label={t("compAggregator")}>
            <Addr value={aggregator} />
          </Stat>
        </div>
      </div>

      {modules.length === 0 ? (
        <p className="py-3 text-center text-[13px] text-parchment-faint">
          {loading ? t("processing") : "—"}
        </p>
      ) : (
        <div className="overflow-hidden border border-ink-500/60">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-500/60 bg-ink-700/50 text-[10.5px] uppercase tracking-wider text-parchment-faint">
                <th className="px-4 py-2.5 font-semibold">{t("compModule")}</th>
                <th className="px-4 py-2.5 font-semibold">{t("compRule")}</th>
                <th className="px-4 py-2.5 text-right font-semibold">{t("compAddress")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-500/40">
              {modules.map((m) => (
                <tr key={m.address} className="hover:bg-ink-700/30">
                  <td className="px-4 py-3">
                    <span className="font-display text-[14px] text-gold">{m.label}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-parchment-dim">{m.detail}</td>
                  <td className="px-4 py-3 text-right">
                    <Addr value={m.address} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

type PC = NonNullable<ReturnType<typeof usePublicClient>>;

/** Best-effort: probe distinctive zero-arg getters to label a module. */
async function probe(pc: PC, address: Address): Promise<ModuleInfo> {
  const tryRead = async (abi: readonly unknown[], fn: string) => {
    try {
      return (await pc.readContract({ address, abi: abi as never, functionName: fn })) as bigint;
    } catch {
      return undefined;
    }
  };

  const maxBalance = await tryRead(MaxBalanceComplianceAbi, "maxBalance");
  if (maxBalance !== undefined) return { address, label: "Max balance", detail: `≤ ${fmtToken(maxBalance)}` };

  const maxHolders = await tryRead(MaxHoldersComplianceAbi, "maxHolders");
  if (maxHolders !== undefined) {
    const count = await tryRead(MaxHoldersComplianceAbi, "holderCount");
    return { address, label: "Max holders", detail: `${count ?? "?"} / ${maxHolders}` };
  }

  const lock = await tryRead(LockupComplianceAbi, "defaultLockup");
  if (lock !== undefined) return { address, label: "Lock-up", detail: `${Number(lock) / 86400} d` };

  return { address, label: "Whitelist / other", detail: "—" };
}
