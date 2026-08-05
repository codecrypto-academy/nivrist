"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { MarketplaceAbi, TokenAbi } from "@/config/abis";
import { addresses } from "@/config/addresses";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { useTokens } from "@/lib/tokens";
import { getAllTokenMeta, type TokenMeta } from "@/lib/offchain";
import { fmtToken, parseAmount, shortAddr } from "@/lib/format";
import { Panel, Field, Button, Addr, Stat, useToast } from "./ui";

interface Listing {
  id: bigint;
  seller: Address;
  token: Address;
  amount: bigint;
  price: bigint;
  active: boolean;
}

export function Marketplace() {
  const { t } = useT();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { run, pending } = useTx();
  const { show, node } = useToast();
  const { tokens } = useTokens();

  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<Record<string, TokenMeta>>({});
  const [sellToken, setSellToken] = useState<Address>(tokens[0]?.address);
  const [amount, setAmount] = useState("100");
  const [price, setPrice] = useState("0.1");

  const load = useCallback(async () => {
    if (!publicClient) return;
    const all = (await publicClient.readContract({
      address: addresses.marketplace,
      abi: MarketplaceAbi,
      functionName: "getListings",
    })) as Listing[];
    setListings([...all].reverse());
    const metas = await getAllTokenMeta();
    setMeta(Object.fromEntries(metas.map((m) => [m.address.toLowerCase(), m])));
  }, [publicClient]);

  useEffect(() => {
    void load();
  }, [load]);

  async function listForSale() {
    if (!sellToken) return;
    try {
      const amt = parseAmount(amount, 18) ?? 0n;
      const priceWei = parseAmount(price, 18) ?? 0n;
      // 1) approve marketplace, 2) list
      await run({ address: sellToken, abi: TokenAbi, functionName: "approve", args: [addresses.marketplace, amt] });
      await run({
        address: addresses.marketplace,
        abi: MarketplaceAbi,
        functionName: "list",
        args: [sellToken, amt, priceWei],
      });
      show(t("mktListed"));
      await load();
    } catch (e) {
      show(errMsg(e), "err");
    }
  }

  const act = async (fn: string, id: bigint, ok: string, value?: bigint) => {
    try {
      await run({ address: addresses.marketplace, abi: MarketplaceAbi, functionName: fn, args: [id], value });
      show(ok);
      await load();
    } catch (e) {
      show(errMsg(e), "err");
    }
  };

  const active = listings.filter((l) => l.active);

  return (
    <div className="space-y-5">
      <Panel index="09" title={t("mktTitle")} subtitle={t("mktDesc")} accent>
        {node}
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* sell form */}
          <div className="space-y-3 border border-ink-500/50 bg-ink-700/20 p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-parchment-faint">
              {t("mktSell")}
            </h3>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-parchment-faint">
                {t("mktToken")}
              </span>
              <select
                value={sellToken}
                onChange={(e) => setSellToken(e.target.value as Address)}
                className="w-full border border-ink-500 bg-ink-700/80 px-3 py-2.5 text-[13px] text-parchment focus-gold"
              >
                {tokens.map((tk) => (
                  <option key={tk.address} value={tk.address}>
                    {tk.symbol} — {shortAddr(tk.address)}
                  </option>
                ))}
              </select>
            </label>
            <Field label={t("mktAmount")} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Field label={t("mktPrice")} hint="ETH" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Button onClick={listForSale} loading={pending} disabled={!address}>
              {t("mktListBtn")}
            </Button>
            <p className="text-[11px] leading-tight text-parchment-faint/80">{t("mktSellHint")}</p>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 gap-3 self-start sm:grid-cols-3">
            <Stat label={t("mktActive")}>{active.length}</Stat>
            <Stat label={t("mktTotal")}>{listings.length}</Stat>
            <div className="col-span-2 sm:col-span-1">
              <Stat label="Marketplace">
                <Addr value={addresses.marketplace} />
              </Stat>
            </div>
          </div>
        </div>
      </Panel>

      <Panel index="10" title={t("mktListings")}>
        {active.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-parchment-faint">{t("mktNoListings")}</p>
        ) : (
          <div className="space-y-3">
            {active.map((l) => (
              <ListingRow
                key={l.id.toString()}
                l={l}
                meta={meta[l.token.toLowerCase()]}
                isSeller={address?.toLowerCase() === l.seller.toLowerCase()}
                pending={pending}
                onBuy={() => act("buy", l.id, t("mktBought"), l.price)}
                onCancel={() => act("cancel", l.id, t("mktCancelled"))}
                canBuy={!!address}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ListingRow({
  l,
  meta,
  isSeller,
  pending,
  onBuy,
  onCancel,
  canBuy,
}: {
  l: Listing;
  meta?: TokenMeta;
  isSeller: boolean;
  pending: boolean;
  onBuy: () => void;
  onCancel: () => void;
  canBuy: boolean;
}) {
  const { t } = useT();
  const { data: symbol } = useReadContract({ address: l.token, abi: TokenAbi, functionName: "symbol" });

  return (
    <div className="flex flex-col gap-3 border border-ink-500/60 bg-ink-700/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[16px] text-parchment">{(symbol as string) ?? "…"}</span>
          <span className="font-mono text-[11px] text-gold/70">#{l.id.toString()}</span>
        </div>
        {meta?.description && (
          <p className="mt-0.5 truncate text-[12px] text-parchment-faint">{meta.description}</p>
        )}
        <div className="mt-1 flex items-center gap-3 font-mono text-[12px] text-parchment-dim">
          <span>
            {fmtToken(l.amount)} {(symbol as string) ?? ""}
          </span>
          <span className="text-parchment-faint">·</span>
          <span className="text-gold">{fmtToken(l.price)} ETH</span>
          <span className="text-parchment-faint">·</span>
          <span className="text-parchment-faint">
            {t("mktSeller")} {shortAddr(l.seller)}
          </span>
        </div>
      </div>
      <div className="shrink-0">
        {isSeller ? (
          <Button variant="ghost" onClick={onCancel} loading={pending} className="!py-2">
            {t("mktCancel")}
          </Button>
        ) : (
          <Button onClick={onBuy} loading={pending} disabled={!canBuy} className="!py-2">
            {t("mktBuy")} · {fmtToken(l.price)} ETH
          </Button>
        )}
      </div>
    </div>
  );
}
