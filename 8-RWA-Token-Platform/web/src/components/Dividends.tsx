"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { RealEstateTokenAbi } from "@/config/abis";
import { ANVIL_ACCOUNTS } from "@/config/wagmi";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { useTokens, type IssuedToken } from "@/lib/tokens";
import { fmtToken, parseAmount, shortAddr } from "@/lib/format";
import { Panel, Field, Button, Addr, Stat, useToast } from "./ui";
import { TokenPicker } from "./TokenPicker";

export function Dividends() {
  const { t } = useT();
  const { byKind } = useTokens();
  const list = byKind("realestate");
  const [sel, setSel] = useState<Address | undefined>(list[0]?.address);
  const token = list.find((x) => x.address === sel) ?? list[0];

  if (!token) {
    return (
      <Panel index="07" title={t("divTitle")}>
        <p className="py-4 text-[13px] text-parchment-faint">{t("divNoToken")}</p>
      </Panel>
    );
  }
  return (
    <div className="space-y-5">
      <TokenPicker list={list} selected={token.address} onSelect={setSel} />
      <Body token={token} />
    </div>
  );
}

function Body({ token }: { token: IssuedToken }) {
  const { t } = useT();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { run, pending } = useTx();
  const { show, node } = useToast();
  const addr = token.address;

  const { data: propertyRef } = useReadContract({
    address: addr,
    abi: RealEstateTokenAbi,
    functionName: "propertyRef",
  });
  const { data: supply, refetch: rSupply } = useReadContract({
    address: addr,
    abi: RealEstateTokenAbi,
    functionName: "totalSupply",
    query: { refetchInterval: 4000 },
  });
  const { data: mine, refetch: rMine } = useReadContract({
    address: addr,
    abi: RealEstateTokenAbi,
    functionName: "withdrawableDividendOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const [contractEth, setContractEth] = useState<bigint>();
  const [depositAmt, setDepositAmt] = useState("1");

  useEffect(() => {
    let on = true;
    if (publicClient) {
      publicClient.getBalance({ address: addr }).then((b) => {
        if (on) setContractEth(b);
      });
    }
    return () => {
      on = false;
    };
  }, [addr, publicClient]);

  const refreshEth = async () => {
    if (publicClient) setContractEth(await publicClient.getBalance({ address: addr }));
  };

  async function deposit() {
    try {
      const value = parseAmount(depositAmt, 18);
      if (!value) return;
      await run({ address: addr, abi: RealEstateTokenAbi, functionName: "depositDividends", value });
      show(t("divDeposited"));
      rSupply();
      rMine();
      refreshEth();
    } catch (e) {
      show(errMsg(e), "err");
    }
  }

  async function claim() {
    try {
      await run({ address: addr, abi: RealEstateTokenAbi, functionName: "claimDividends" });
      show(t("divClaimed"));
      rMine();
      refreshEth();
    } catch (e) {
      show(errMsg(e), "err");
    }
  }

  return (
    <Panel index="07" title={`${t("divTitle")} · ${token.symbol}`} subtitle={t("divDesc")} accent>
      {node}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("opsSupply")}>{fmtToken(supply as bigint | undefined)}</Stat>
        <Stat label={t("divContractBal")}>
          <span className="text-gold">{fmtToken(contractEth)} </span>
          <span className="text-[11px] text-parchment-faint">ETH</span>
        </Stat>
        <div className="col-span-2">
          <Stat label={t("divProperty")}>
            <span className="text-[13px]">{(propertyRef as string) || "—"}</span>
          </Stat>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* deposit */}
        <div className="space-y-3 border border-ink-500/50 bg-ink-700/20 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-parchment-faint">
            {t("divDeposit")}
          </h3>
          <Field label="ETH" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} />
          <Button onClick={deposit} loading={pending}>
            {t("divDepositBtn")}
          </Button>
        </div>

        {/* claim (connected account) */}
        <div className="space-y-3 border border-ink-500/50 bg-ink-700/20 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-parchment-faint">
            {t("divWithdrawable")} <Addr value={address} />
          </h3>
          <div className="font-mono text-2xl tabnum text-gold">
            {fmtToken(mine as bigint | undefined)} <span className="text-sm text-parchment-faint">ETH</span>
          </div>
          <Button onClick={claim} loading={pending} disabled={!address || (mine as bigint) === 0n}>
            {t("divClaim")}
          </Button>
        </div>
      </div>

      <HoldersTable token={addr} />
    </Panel>
  );
}

function HoldersTable({ token }: { token: Address }) {
  const { t } = useT();
  return (
    <div className="mt-5 overflow-hidden border border-ink-500/60">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-ink-500/60 bg-ink-700/50 text-[10.5px] uppercase tracking-wider text-parchment-faint">
            <th className="px-4 py-2.5 font-semibold">{t("divHolder")}</th>
            <th className="px-4 py-2.5 text-right font-semibold">{t("divBalance")}</th>
            <th className="px-4 py-2.5 text-right font-semibold">{t("divClaimable")} (ETH)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-500/40">
          {ANVIL_ACCOUNTS.map((a) => (
            <HolderRow key={a} token={token} holder={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HolderRow({ token, holder }: { token: Address; holder: Address }) {
  const { data: bal } = useReadContract({
    address: token,
    abi: RealEstateTokenAbi,
    functionName: "balanceOf",
    args: [holder],
    query: { refetchInterval: 4000 },
  });
  const { data: claimable } = useReadContract({
    address: token,
    abi: RealEstateTokenAbi,
    functionName: "withdrawableDividendOf",
    args: [holder],
    query: { refetchInterval: 4000 },
  });
  const b = (bal as bigint | undefined) ?? 0n;
  if (b === 0n && ((claimable as bigint | undefined) ?? 0n) === 0n) return null;
  return (
    <tr className="hover:bg-ink-700/30">
      <td className="px-4 py-3 font-mono text-[12px] text-parchment-dim">{shortAddr(holder)}</td>
      <td className="px-4 py-3 text-right font-mono tabnum text-parchment">{fmtToken(b)}</td>
      <td className="px-4 py-3 text-right font-mono tabnum text-gold">
        {fmtToken(claimable as bigint | undefined)}
      </td>
    </tr>
  );
}
