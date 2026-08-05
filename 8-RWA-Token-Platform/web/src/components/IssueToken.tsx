"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { addresses } from "@/config/addresses";
import { TokenCloneFactoryAbi, ComplianceAggregatorAbi } from "@/config/abis";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { parseAmount } from "@/lib/format";
import { useTokens } from "@/lib/tokens";
import { Panel, Field, Button, Addr, useToast } from "./ui";

export function IssueToken() {
  const { t } = useT();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { run, pending } = useTx();
  const { show, node } = useToast();
  const { tokens, add, select, selected } = useTokens();

  const [name, setName] = useState("Acme Real Estate");
  const [symbol, setSymbol] = useState("ACME");
  const [decimals, setDecimals] = useState("18");
  const [maxBalance, setMaxBalance] = useState("500000");
  const [maxHolders, setMaxHolders] = useState("100");
  const [lockup, setLockup] = useState("0");

  async function issue() {
    if (!publicClient || !address) return;
    const dec = Number(decimals);
    try {
      const impl = (await publicClient.readContract({
        address: addresses.tokenCloneFactory,
        abi: TokenCloneFactoryAbi,
        functionName: "tokenImplementation",
      })) as Address;

      const mb = parseAmount(maxBalance || "0", dec) ?? 0n;
      const lockSeconds = BigInt(Number(lockup) * 86400);

      await run({
        address: addresses.tokenCloneFactory,
        abi: TokenCloneFactoryAbi,
        functionName: "createTokenWithCompliance",
        args: [impl, name, symbol, dec, address, addresses.identityRegistry, mb, BigInt(maxHolders || "0"), lockSeconds],
      });

      // read back the freshly-created deployment
      const list = (await publicClient.readContract({
        address: addresses.tokenCloneFactory,
        abi: TokenCloneFactoryAbi,
        functionName: "deployments",
      })) as ReadonlyArray<{ token: Address; aggregator: Address; admin: Address }>;
      const last = list[list.length - 1];

      const modules = (await publicClient.readContract({
        address: last.aggregator,
        abi: ComplianceAggregatorAbi,
        functionName: "moduleCount",
      })) as bigint;

      add({ address: last.token, name, symbol, aggregator: last.aggregator, modules: Number(modules) });
      show(`${t("issDeployed")}: ${symbol}`);
    } catch (e) {
      show(errMsg(e), "err");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <Panel index="03" title={t("issTitle")} subtitle={t("issDesc")}>
        {node}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("issName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Field label={t("issSymbol")} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <Field label={t("issDecimals")} value={decimals} onChange={(e) => setDecimals(e.target.value)} />
          <Field
            label={t("issMaxBalance")}
            hint={t("issZeroHint")}
            value={maxBalance}
            onChange={(e) => setMaxBalance(e.target.value)}
          />
          <Field
            label={t("issMaxHolders")}
            hint={t("issZeroHint")}
            value={maxHolders}
            onChange={(e) => setMaxHolders(e.target.value)}
          />
          <Field
            label={t("issLockup")}
            hint={t("issZeroHint")}
            value={lockup}
            onChange={(e) => setLockup(e.target.value)}
          />
        </div>
        <div className="mt-5">
          <Button onClick={issue} loading={pending} disabled={!address}>
            {t("issDeploy")}
          </Button>
        </div>
      </Panel>

      <Panel index="04" title={t("issYourTokens")}>
        {tokens.length === 0 ? (
          <p className="py-4 text-[13px] text-parchment-faint">{t("issNoTokens")}</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((tok) => {
              const active = tok.address === selected;
              return (
                <li
                  key={tok.address}
                  className={`flex items-center justify-between border px-4 py-3 ${
                    active ? "border-gold/60 bg-gold/5" : "border-ink-500/60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-[15px] text-parchment">{tok.symbol}</span>
                      <span className="truncate text-[12px] text-parchment-faint">{tok.name}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3">
                      <Addr value={tok.address} />
                      <span className="font-mono text-[11px] text-gold/80">
                        {tok.modules} {t("issModules")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={active ? "gold" : "ghost"}
                    onClick={() => select(tok.address)}
                    className="!px-3 !py-1.5"
                  >
                    {active ? "✓" : t("issSelect")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
