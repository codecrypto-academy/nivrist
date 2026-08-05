"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { addresses } from "@/config/addresses";
import { IdentityRegistryAbi } from "@/config/abis";
import { useT } from "@/lib/i18n";
import { mongoHealth } from "@/lib/offchain";
import { Panel, Addr, StatusDot, Stat } from "./ui";

export function Overview() {
  const { t } = useT();
  const { address } = useAccount();
  const [mongoUp, setMongoUp] = useState<boolean | null>(null);
  useEffect(() => {
    void mongoHealth().then(setMongoUp);
  }, []);

  const { data: verified } = useReadContract({
    address: addresses.identityRegistry,
    abi: IdentityRegistryAbi,
    functionName: "isVerified",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  });

  const { data: isAgent } = useReadContract({
    address: addresses.identityRegistry,
    abi: IdentityRegistryAbi,
    functionName: "isAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const isDeployer = address?.toLowerCase() === addresses.deployer.toLowerCase();

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <Panel index="00" title={t("ovInfra")}>
        <dl className="divide-y divide-ink-500/50">
          <Row label={t("ovTrustedIssuers")} value={addresses.trustedIssuersRegistry} />
          <Row label={t("ovRegistry")} value={addresses.identityRegistry} />
          <Row label={t("ovTokenFactory")} value={addresses.tokenCloneFactory} />
          <Row label={t("ovMarketplace")} value={addresses.marketplace} />
          <Row label={t("ovPresetMgr")} value={addresses.compliancePresetManager} />
          <Row label={t("ovDeployer")} value={addresses.deployer} />
          <div className="flex items-center justify-between py-3">
            <span className="text-[12.5px] text-parchment-dim">{t("ovMongo")}</span>
            <StatusDot
              ok={!!mongoUp}
              label={mongoUp === null ? "…" : mongoUp ? t("ovMongoUp") : t("ovMongoDown")}
            />
          </div>
        </dl>
      </Panel>

      <Panel index="01" title={t("ovYourStatus")}>
        {address ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t("account")}>
                <Addr value={address} />
              </Stat>
              <Stat label="chain">
                <span className="text-gold">31337</span>
              </Stat>
            </div>
            <div className="space-y-2.5 border-t border-ink-500/50 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-parchment-dim">KYC</span>
                <StatusDot ok={!!verified} label={verified ? t("ovVerified") : t("ovUnverified")} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-parchment-dim">Agent</span>
                <StatusDot
                  ok={!!isAgent || isDeployer}
                  label={isAgent || isDeployer ? t("ovYouAreAgent") : t("ovYouAreNotAgent")}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-parchment-faint">{t("connectToStart")}</p>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[12.5px] text-parchment-dim">{label}</span>
      <Addr value={value} />
    </div>
  );
}
