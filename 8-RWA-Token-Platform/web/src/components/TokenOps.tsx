"use client";

import { useState } from "react";
import { useReadContract, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { TokenAbi } from "@/config/abis";
import { ANVIL_ACCOUNTS } from "@/config/wagmi";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { useTokens } from "@/lib/tokens";
import { parseAmount, fmtToken, isAddress } from "@/lib/format";
import { Panel, Field, Button, Addr, StatusDot, Stat, useToast } from "./ui";

export function TokenOps() {
  const { t } = useT();
  const { current } = useTokens();
  const token = current?.address;

  if (!token) {
    return (
      <Panel index="06" title={t("opsTitle")}>
        <p className="py-4 text-[13px] text-parchment-faint">{t("compNoToken")}</p>
      </Panel>
    );
  }
  return <Ops token={token} symbol={current.symbol} />;
}

function Ops({ token, symbol }: { token: Address; symbol: string }) {
  const { t } = useT();
  const publicClient = usePublicClient();
  const { run, pending } = useTx();
  const { show, node } = useToast();

  const { data: decimals } = useReadContract({ address: token, abi: TokenAbi, functionName: "decimals" });
  const dec = Number(decimals ?? 18);
  const { data: supply, refetch: refetchSupply } = useReadContract({
    address: token,
    abi: TokenAbi,
    functionName: "totalSupply",
    query: { refetchInterval: 4000 },
  });
  const { data: paused, refetch: refetchPaused } = useReadContract({
    address: token,
    abi: TokenAbi,
    functionName: "paused",
    query: { refetchInterval: 4000 },
  });

  const [mintTo, setMintTo] = useState<string>(ANVIL_ACCOUNTS[1]);
  const [mintAmt, setMintAmt] = useState("1000");
  const [freezeAcct, setFreezeAcct] = useState<string>(ANVIL_ACCOUNTS[1]);
  const [fFrom, setFFrom] = useState<string>(ANVIL_ACCOUNTS[1]);
  const [fTo, setFTo] = useState<string>(ANVIL_ACCOUNTS[2]);
  const [fAmt, setFAmt] = useState("100");
  const [balQuery, setBalQuery] = useState<string>(ANVIL_ACCOUNTS[1]);

  const { data: bal, refetch: refetchBal } = useReadContract({
    address: token,
    abi: TokenAbi,
    functionName: "balanceOf",
    args: isAddress(balQuery) ? [balQuery as Address] : undefined,
    query: { enabled: isAddress(balQuery), refetchInterval: 4000 },
  });

  const call = async (fn: string, args: readonly unknown[], ok: string) => {
    try {
      await run({ address: token, abi: TokenAbi, functionName: fn, args });
      show(ok);
      refetchSupply();
      refetchPaused();
      refetchBal();
    } catch (e) {
      show(errMsg(e), "err");
    }
  };

  return (
    <Panel index="06" title={t("opsTitle")} subtitle={t("opsAgentOnly")}>
      {node}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("issSymbol")}>{symbol}</Stat>
        <Stat label={t("opsSupply")}>{fmtToken(supply as bigint | undefined, dec)}</Stat>
        <Stat label="decimals">{dec}</Stat>
        <div className="flex items-center border border-ink-500/60 bg-ink-700/40 px-4">
          <StatusDot ok={!paused} label={paused ? t("opsPaused") : t("opsLive")} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* mint / burn */}
        <Card title={`${t("opsMint")} / ${t("opsBurn")}`}>
          <Field label={t("opsTo")} value={mintTo} onChange={(e) => setMintTo(e.target.value)} />
          <Field label={t("opsAmount")} value={mintAmt} onChange={(e) => setMintAmt(e.target.value)} />
          <div className="flex gap-2">
            <Button
              loading={pending}
              onClick={() => call("mint", [mintTo as Address, parseAmount(mintAmt, dec) ?? 0n], t("txSent"))}
            >
              {t("opsMint")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => call("burn", [mintTo as Address, parseAmount(mintAmt, dec) ?? 0n], t("txSent"))}
            >
              {t("opsBurn")}
            </Button>
          </div>
        </Card>

        {/* freeze / pause */}
        <Card title={`${t("opsFreeze")} / ${t("opsPause")}`}>
          <Field label={t("account")} value={freezeAcct} onChange={(e) => setFreezeAcct(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              loading={pending}
              onClick={() => call("setFrozen", [freezeAcct as Address, true], t("txSent"))}
            >
              {t("opsFreeze")}
            </Button>
            <Button
              variant="sage"
              loading={pending}
              onClick={() => call("setFrozen", [freezeAcct as Address, false], t("txSent"))}
            >
              {t("opsUnfreeze")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-ink-500/50 pt-3">
            <Button
              variant="danger"
              loading={pending}
              onClick={() => call("setPaused", [true], t("txSent"))}
            >
              {t("opsPause")}
            </Button>
            <Button
              variant="sage"
              loading={pending}
              onClick={() => call("setPaused", [false], t("txSent"))}
            >
              {t("opsUnpause")}
            </Button>
          </div>
        </Card>

        {/* forced transfer */}
        <Card title={t("opsForced")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("opsFrom")} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
            <Field label={t("opsTo")} value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
          <Field label={t("opsAmount")} value={fAmt} onChange={(e) => setFAmt(e.target.value)} />
          <Button
            loading={pending}
            onClick={() =>
              call("forcedTransfer", [fFrom as Address, fTo as Address, parseAmount(fAmt, dec) ?? 0n], t("txSent"))
            }
          >
            {t("opsTransfer")}
          </Button>
        </Card>

        {/* balance lookup */}
        <Card title={t("opsBalanceOf")}>
          <Field label={t("account")} value={balQuery} onChange={(e) => setBalQuery(e.target.value)} />
          <div className="border border-ink-500/60 bg-ink-700/40 px-4 py-4">
            <div className="text-[10.5px] uppercase tracking-wider text-parchment-faint">
              <Addr value={isAddress(balQuery) ? balQuery : undefined} />
            </div>
            <div className="mt-1 font-mono text-2xl tabnum text-gold">
              {fmtToken(bal as bigint | undefined, dec)} <span className="text-sm text-parchment-faint">{symbol}</span>
            </div>
          </div>
        </Card>
      </div>
    </Panel>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border border-ink-500/50 bg-ink-700/20 p-4">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-parchment-faint">{title}</h3>
      {children}
    </div>
  );
}
