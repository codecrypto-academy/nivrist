"use client";

import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { ChevronDown, Wallet } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { ANVIL_ACCOUNTS } from "@/config/wagmi";
import { addresses } from "@/config/addresses";
import { shortAddr } from "@/lib/format";

const LABELS = ["#0 · owner/agent", "#1 · inversor", "#2", "#3"];

export function ConnectBar() {
  const { t } = useT();
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [open, setOpen] = useState(false);

  const mock = connectors.find((c) => c.id === "mock");
  const injected = connectors.find((c) => c.type === "injected");
  const wrongChain = isConnected && chainId !== addresses.chainId;

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2">
        {mock && (
          <button
            onClick={() => connect({ connector: mock })}
            className="inline-flex items-center gap-2 border border-gold/50 bg-gold px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-ink hover:bg-gold-bright focus-gold"
          >
            <Wallet size={14} /> {t("connect")} (anvil)
          </button>
        )}
        {injected && (
          <button
            onClick={() => connect({ connector: injected })}
            className="border border-ink-500 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-parchment-dim hover:border-gold/50 focus-gold"
          >
            MetaMask
          </button>
        )}
      </div>
    );
  }

  const accountIndex = ANVIL_ACCOUNTS.findIndex(
    (a) => a.toLowerCase() === address?.toLowerCase(),
  );

  return (
    <div className="flex items-center gap-2">
      {wrongChain && (
        <span className="border border-rust/60 px-2 py-1 text-[11px] text-rust">{t("wrongChain")}</span>
      )}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 border border-ink-500 bg-ink-700 px-3 py-2 text-[12px] focus-gold"
        >
          <span className="h-2 w-2 rounded-full bg-sage" />
          <span className="font-mono text-parchment">{shortAddr(address)}</span>
          {connector?.id === "mock" && accountIndex >= 0 && (
            <span className="text-[10px] text-gold">{LABELS[accountIndex]?.split(" · ")[0]}</span>
          )}
          <ChevronDown size={13} className="text-parchment-faint" />
        </button>

        {open && (
          <div className="absolute right-0 z-40 mt-1 w-64 border border-ink-500 bg-ink-800 shadow-lift">
            {connector?.id === "mock" && (
              <div className="border-b border-ink-500/60 p-2">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-parchment-faint">
                  {t("account")} (anvil)
                </div>
                {ANVIL_ACCOUNTS.map((a, i) => (
                  <button
                    key={a}
                    onClick={() => {
                      if (mock) connect({ connector: mock, chainId: addresses.chainId });
                      // wagmi mock exposes accounts[0]; switching handled by re-connect below
                      switchMockAccount(i);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] hover:bg-ink-600 ${
                      a.toLowerCase() === address?.toLowerCase() ? "text-gold" : "text-parchment-dim"
                    }`}
                  >
                    <span className="font-mono">{shortAddr(a)}</span>
                    <span className="text-[10px] text-parchment-faint">{LABELS[i]}</span>
                  </button>
                ))}
                <p className="px-2 py-1 text-[10px] leading-tight text-parchment-faint/70">
                  {t("opsAgentOnly")}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="w-full px-3 py-2.5 text-left text-[12px] text-rust hover:bg-ink-600"
            >
              {t("disconnect")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The wagmi mock connector fixes accounts[0] as the active account. To act as a
 * different anvil account we reorder the stored preference and reload; the mock
 * connector then picks the new first account.
 */
function switchMockAccount(index: number) {
  if (index === 0) return;
  try {
    localStorage.setItem("rwa_mock_account", String(index));
  } catch {
    /* ignore */
  }
  window.location.reload();
}
