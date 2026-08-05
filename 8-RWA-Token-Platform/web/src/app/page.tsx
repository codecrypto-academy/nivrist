"use client";

import { useState } from "react";
import { Building2, Languages } from "lucide-react";
import { useT } from "@/lib/i18n";
import { TokensProvider } from "@/lib/tokens";
import { ConnectBar } from "@/components/ConnectBar";
import { Overview } from "@/components/Overview";
import { OnboardInvestor } from "@/components/OnboardInvestor";
import { IssueToken } from "@/components/IssueToken";
import { CompliancePanel } from "@/components/CompliancePanel";
import { TokenOps } from "@/components/TokenOps";
import { Dividends } from "@/components/Dividends";
import { Governance } from "@/components/Governance";

type Tab = "overview" | "onboard" | "issue" | "compliance" | "ops" | "dividends" | "governance";

const TABS: { id: Tab; key: Parameters<ReturnType<typeof useT>["t"]>[0] }[] = [
  { id: "overview", key: "navOverview" },
  { id: "onboard", key: "navOnboard" },
  { id: "issue", key: "navIssue" },
  { id: "compliance", key: "navCompliance" },
  { id: "ops", key: "navOps" },
  { id: "dividends", key: "navDividends" },
  { id: "governance", key: "navGovernance" },
];

export default function Page() {
  const { t, lang, toggle } = useT();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <TokensProvider>
      <div className="relative z-10 mx-auto min-h-screen max-w-6xl px-5 pb-24 pt-6 sm:px-8">
        {/* header */}
        <header className="mb-8 flex flex-col gap-4 border-b border-ink-500/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center border border-gold/40 bg-gold/5 text-gold">
              <Building2 size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black italic leading-none tracking-tight text-parchment sm:text-4xl">
                {t("brand")}
              </h1>
              <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gold/70">
                {t("tagline")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="inline-flex items-center gap-1.5 border border-ink-500 px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-parchment-dim hover:border-gold/50 focus-gold"
            >
              <Languages size={14} /> {lang === "es" ? "EN" : "ES"}
            </button>
            <ConnectBar />
          </div>
        </header>

        {/* nav */}
        <nav className="mb-8 flex flex-wrap gap-1 border-b border-ink-500/40">
          {TABS.map((tb, i) => {
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`relative -mb-px border-b-2 px-4 py-3 text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? "border-gold text-parchment"
                    : "border-transparent text-parchment-faint hover:text-parchment-dim"
                }`}
              >
                <span className="mr-1.5 font-mono text-[10px] text-gold/60">
                  {String(i).padStart(2, "0")}
                </span>
                {t(tb.key)}
              </button>
            );
          })}
        </nav>

        {/* content */}
        <main key={tab} className="animate-rise space-y-5">
          {tab === "overview" && <Overview />}
          {tab === "onboard" && <OnboardInvestor />}
          {tab === "issue" && <IssueToken />}
          {tab === "compliance" && <CompliancePanel />}
          {tab === "ops" && <TokenOps />}
          {tab === "dividends" && <Dividends />}
          {tab === "governance" && <Governance />}
        </main>

        <footer className="mt-16 border-t border-ink-500/40 pt-6 text-center font-mono text-[11px] text-parchment-faint/60">
          ERC-3643 · T-REX · Foundry + wagmi/viem · anvil {addresses_chain()}
        </footer>
      </div>
    </TokensProvider>
  );
}

function addresses_chain() {
  return "31337";
}
