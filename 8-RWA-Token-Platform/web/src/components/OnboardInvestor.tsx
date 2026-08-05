"use client";

import { useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { addresses, KYC_TOPIC } from "@/config/addresses";
import { IdentityCloneFactoryAbi, IdentityAbi, IdentityRegistryAbi } from "@/config/abis";
import { ANVIL_ACCOUNTS } from "@/config/wagmi";
import { useT } from "@/lib/i18n";
import { useTx, errMsg } from "@/lib/useTx";
import { isAddress } from "@/lib/format";
import { Panel, Field, Button, StatusDot, useToast } from "./ui";

const STEP_KEYS = ["onbStep1", "onbStep2", "onbStep3"] as const;

export function OnboardInvestor() {
  const { t } = useT();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { run, pending } = useTx();
  const { show, node } = useToast();

  const [wallet, setWallet] = useState<string>(ANVIL_ACCOUNTS[2]);
  const [country, setCountry] = useState("840");
  const [step, setStep] = useState(0);
  const [verified, setVerified] = useState<boolean | null>(null);

  const valid = isAddress(wallet) && /^\d+$/.test(country);
  const isIssuer = address?.toLowerCase() === addresses.deployer.toLowerCase();

  async function check() {
    if (!publicClient || !isAddress(wallet)) return;
    const v = await publicClient.readContract({
      address: addresses.identityRegistry,
      abi: IdentityRegistryAbi,
      functionName: "isVerified",
      args: [wallet as Address],
    });
    setVerified(Boolean(v));
  }

  async function onboard() {
    if (!publicClient || !valid) return;
    try {
      const investor = wallet as Address;

      // 1 · identity (skip if it already exists)
      let identity = (await publicClient.readContract({
        address: addresses.identityCloneFactory,
        abi: IdentityCloneFactoryAbi,
        functionName: "identityOfOwner",
        args: [investor],
      })) as Address;

      if (identity === "0x0000000000000000000000000000000000000000") {
        setStep(1);
        await run({
          address: addresses.identityCloneFactory,
          abi: IdentityCloneFactoryAbi,
          functionName: "createIdentity",
          args: [investor],
        });
        identity = (await publicClient.readContract({
          address: addresses.identityCloneFactory,
          abi: IdentityCloneFactoryAbi,
          functionName: "identityOfOwner",
          args: [investor],
        })) as Address;
      }

      // 2 · KYC claim, issued by the trusted issuer (deployer)
      setStep(2);
      await run({
        address: identity,
        abi: IdentityAbi,
        functionName: "addClaim",
        args: [KYC_TOPIC, addresses.deployer, "0x"],
      });

      // 3 · register in the registry
      setStep(3);
      await run({
        address: addresses.identityRegistry,
        abi: IdentityRegistryAbi,
        functionName: "registerIdentity",
        args: [investor, identity, Number(country)],
      });

      setStep(0);
      setVerified(true);
      show(t("onbDone"));
    } catch (e) {
      setStep(0);
      show(errMsg(e), "err");
    }
  }

  return (
    <Panel index="02" title={t("onbTitle")} subtitle={t("onbDesc")}>
      {node}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <Field
            label={t("onbWallet")}
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x…"
          />
          <Field
            label={t("onbCountry")}
            hint="840=US · 724=ES"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={onboard} loading={pending} disabled={!valid || !isIssuer}>
              {t("onbRun")}
            </Button>
            <Button variant="ghost" onClick={check} disabled={!isAddress(wallet)}>
              {t("onbCheck")}
            </Button>
          </div>
          {!isIssuer && (
            <p className="text-[12px] text-rust">
              {t("ovDeployer")}: {addresses.deployer.slice(0, 10)}… — {t("connect")}
            </p>
          )}
          {verified !== null && (
            <StatusDot ok={verified} label={verified ? t("ovVerified") : t("ovUnverified")} />
          )}
        </div>

        <ol className="space-y-2.5">
          {STEP_KEYS.map((k, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n || (step === 0 && verified);
            return (
              <li
                key={k}
                className={`flex items-center gap-3 border px-4 py-3 text-[13px] transition-colors ${
                  active
                    ? "border-gold/60 bg-gold/5 text-parchment"
                    : done
                      ? "border-sage/40 text-sage"
                      : "border-ink-500/60 text-parchment-faint"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center font-mono text-[11px] ${
                    active
                      ? "bg-gold text-ink animate-pulseGold"
                      : done
                        ? "bg-sage/20 text-sage"
                        : "bg-ink-600 text-parchment-faint"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                {t(k)}
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}
