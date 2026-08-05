"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { EquityTokenAbi } from "@/config/abis";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { useTokens, type IssuedToken } from "@/lib/tokens";
import { fmtToken } from "@/lib/format";
import { Panel, Field, Button, Stat, useToast } from "./ui";
import { TokenPicker } from "./TokenPicker";

interface Proposal {
  id: bigint;
  description: string;
  forVotes: bigint;
  againstVotes: bigint;
  deadline: bigint;
  executed: boolean;
}

export function Governance() {
  const { t } = useT();
  const { byKind } = useTokens();
  const list = byKind("equity");
  const [sel, setSel] = useState<Address | undefined>(list[0]?.address);
  const token = list.find((x) => x.address === sel) ?? list[0];

  if (!token) {
    return (
      <Panel index="08" title={t("govTitle")}>
        <p className="py-4 text-[13px] text-parchment-faint">{t("govNoToken")}</p>
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

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [desc, setDesc] = useState("Aprobar recompra de acciones");
  const [days, setDays] = useState("3");

  const { data: weight } = useReadContract({
    address: addr,
    abi: EquityTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const load = useCallback(async () => {
    if (!publicClient) return;
    const count = (await publicClient.readContract({
      address: addr,
      abi: EquityTokenAbi,
      functionName: "proposalCount",
    })) as bigint;
    const items: Proposal[] = [];
    for (let i = 0n; i < count; i++) {
      const p = (await publicClient.readContract({
        address: addr,
        abi: EquityTokenAbi,
        functionName: "getProposal",
        args: [i],
      })) as Proposal;
      items.push(p);
    }
    setProposals(items.reverse());
  }, [publicClient, addr]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: string, args: readonly unknown[], ok: string) => {
    try {
      await run({ address: addr, abi: EquityTokenAbi, functionName: fn, args });
      show(ok);
      await load();
    } catch (e) {
      show(errMsg(e), "err");
    }
  };

  const now = BigInt(Math.floor(Date.now() / 1000));

  return (
    <Panel index="08" title={`${t("govTitle")} · ${token.symbol}`} subtitle={t("govDesc")} accent>
      {node}

      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* new proposal */}
        <div className="space-y-3 border border-ink-500/50 bg-ink-700/20 p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-parchment-faint">
            {t("govNew")}
          </h3>
          <Field label={t("govDescription")} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Field label={t("govDuration")} value={days} onChange={(e) => setDays(e.target.value)} />
          <Button
            loading={pending}
            onClick={() => act("createProposal", [desc, BigInt(Number(days) * 86400)], t("govCreated"))}
          >
            {t("govCreate")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 self-start">
          <Stat label={t("govYourWeight")}>
            {fmtToken(weight as bigint | undefined)} <span className="text-[11px] text-parchment-faint">{token.symbol}</span>
          </Stat>
          <Stat label={t("govProposals")}>{proposals.length}</Stat>
        </div>
      </div>

      {proposals.length === 0 ? (
        <p className="py-3 text-center text-[13px] text-parchment-faint">{t("govNoProposals")}</p>
      ) : (
        <ul className="space-y-3">
          {proposals.map((p) => (
            <ProposalRow
              key={p.id.toString()}
              p={p}
              now={now}
              pending={pending}
              onVote={(support) => act("vote", [p.id, support], t("govVoted"))}
              onExecute={() => act("executeProposal", [p.id], t("govExecuted"))}
              canVote={!!address && (weight as bigint | undefined ?? 0n) > 0n}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ProposalRow({
  p,
  now,
  pending,
  onVote,
  onExecute,
  canVote,
}: {
  p: Proposal;
  now: bigint;
  pending: boolean;
  onVote: (support: boolean) => void;
  onExecute: () => void;
  canVote: boolean;
}) {
  const { t } = useT();
  const open = now < p.deadline;
  const passed = p.forVotes > p.againstVotes;
  const total = p.forVotes + p.againstVotes;
  const forPct = total > 0n ? Number((p.forVotes * 100n) / total) : 0;

  const status = p.executed
    ? passed
      ? { label: t("govPassed"), cls: "text-sage border-sage/50" }
      : { label: t("govRejected"), cls: "text-rust border-rust/50" }
    : open
      ? { label: t("govOpen"), cls: "text-gold border-gold/50" }
      : { label: t("govClosed"), cls: "text-parchment-dim border-ink-500" };

  return (
    <li className="border border-ink-500/60 bg-ink-700/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-gold/70">#{p.id.toString()}</span>
            <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-1.5 font-display text-[15px] leading-snug text-parchment">{p.description}</p>
        </div>
        {!open && !p.executed && (
          <Button variant="ghost" onClick={onExecute} loading={pending} className="!px-3 !py-1.5">
            {t("govExecute")}
          </Button>
        )}
      </div>

      {/* vote bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between font-mono text-[11px]">
          <span className="text-sage">
            {t("govFor")} {fmtToken(p.forVotes)}
          </span>
          <span className="text-rust">
            {t("govAgainst")} {fmtToken(p.againstVotes)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden bg-rust/30">
          <div className="h-full bg-sage" style={{ width: `${forPct}%` }} />
        </div>
      </div>

      {open && (
        <div className="mt-3 flex gap-2">
          <Button variant="sage" onClick={() => onVote(true)} loading={pending} disabled={!canVote} className="!py-1.5">
            {t("govVoteFor")}
          </Button>
          <Button variant="danger" onClick={() => onVote(false)} loading={pending} disabled={!canVote} className="!py-1.5">
            {t("govVoteAgainst")}
          </Button>
        </div>
      )}
    </li>
  );
}
