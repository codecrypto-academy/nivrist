"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { addresses } from "@/config/addresses";
import { TokenCloneFactoryAbi, ComplianceAggregatorAbi } from "@/config/abis";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { parseAmount } from "@/lib/format";
import { useTokens, type TokenKind } from "@/lib/tokens";
import { saveTokenMeta } from "@/lib/offchain";
import { Panel, Field, Button, Addr, useToast } from "./ui";

const KINDS: { id: TokenKind; label: string }[] = [
  { id: "base", label: "Base" },
  { id: "realestate", label: "Real Estate" },
  { id: "equity", label: "Equity" },
];

export function IssueToken() {
  const { t } = useT();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { run, pending } = useTx();
  const { show, node } = useToast();
  const { tokens, add, select, selected } = useTokens();

  const [kind, setKind] = useState<TokenKind>("base");
  const [name, setName] = useState("Acme Real Estate");
  const [symbol, setSymbol] = useState("ACME");
  const [decimals, setDecimals] = useState("18");
  const [maxBalance, setMaxBalance] = useState("500000");
  const [maxHolders, setMaxHolders] = useState("100");
  const [lockup, setLockup] = useState("0");
  const [description, setDescription] = useState("");

  async function implFor(k: TokenKind): Promise<Address> {
    if (k === "realestate") return addresses.realEstateImpl;
    if (k === "equity") return addresses.equityImpl;
    return (await publicClient!.readContract({
      address: addresses.tokenCloneFactory,
      abi: TokenCloneFactoryAbi,
      functionName: "tokenImplementation",
    })) as Address;
  }

  async function issue() {
    if (!publicClient || !address) return;
    const dec = Number(decimals);
    try {
      const impl = await implFor(kind);

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

      add({ address: last.token, name, symbol, aggregator: last.aggregator, modules: Number(modules), kind });
      // metadata off-chain (MongoDB) — opcional
      void saveTokenMeta({ address: last.token, description, assetType: kind });
      show(`${t("issDeployed")}: ${symbol}`);
    } catch (e) {
      show(errMsg(e), "err");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <Panel index="03" title={t("issTitle")} subtitle={t("issDesc")}>
        {node}
        <div className="mb-4">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-parchment-faint">
            {t("issType")}
          </span>
          <div className="flex gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`flex-1 border px-3 py-2 text-[12px] font-semibold uppercase tracking-wider transition-colors ${
                  kind === k.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-ink-500 text-parchment-faint hover:text-parchment-dim"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-parchment-faint/80">
            {t(
              ({ base: "issType_base", realestate: "issType_realestate", equity: "issType_equity" } as const)[
                kind
              ],
            )}
          </p>
        </div>
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
        <div className="mt-4">
          <Field
            label={t("issDescription")}
            hint={t("issOffchain")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                      {tok.kind !== "base" && (
                        <span className="shrink-0 border border-gold/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold/90">
                          {tok.kind === "realestate" ? "RE" : "EQ"}
                        </span>
                      )}
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
