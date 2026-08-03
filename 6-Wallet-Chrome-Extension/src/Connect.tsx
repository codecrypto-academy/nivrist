import { useEffect, useState } from "react";
import "./App.css";
import { useI18n } from "./lib/i18n";
import { sendRPC, storageGet, storageSet, STORAGE_KEYS as K, shortAddr, formatEth } from "./lib/rpc";

interface ConnectRequest {
  requestId: number;
  origin: string;
  accounts: string[];
  currentAccountIndex: number;
}

export default function Connect() {
  const { t, lang, toggle } = useI18n();
  const [req, setReq] = useState<ConnectRequest | null>(null);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    (async () => {
      const r = await storageGet<Record<string, ConnectRequest>>(["codecrypto_connect_request"]);
      const data = r["codecrypto_connect_request"];
      if (!data) return;
      setReq(data);
      setSelected(data.currentAccountIndex || 0);
      // balances en tiempo real vía background
      for (const addr of data.accounts) {
        try {
          const bal = (await sendRPC("eth_getBalance", [addr, "latest"])) as string;
          setBalances((b) => ({ ...b, [addr]: bal }));
        } catch {
          setBalances((b) => ({ ...b, [addr]: "0x0" }));
        }
      }
    })();
  }, []);

  async function connect() {
    if (!req) return;
    await storageSet({ [K.current]: String(selected) });
    chrome.runtime.sendMessage({
      type: "CONNECT_RESPONSE",
      success: true,
      account: req.accounts[selected],
      accountIndex: selected,
      requestId: req.requestId,
    });
    window.close();
  }
  function cancel() {
    if (req)
      chrome.runtime.sendMessage({
        type: "CONNECT_RESPONSE",
        success: false,
        error: "User rejected connection",
        requestId: req.requestId,
      });
    window.close();
  }

  return (
    <div className="page">
      <div className="between">
        <div className="brand"><img className="logo" src="vite.svg" alt="" /> CodeCrypto</div>
        <button className="btn btn-ghost btn-sm" onClick={toggle}>{lang.toUpperCase()}</button>
      </div>

      {!req ? (
        <div className="panel muted">{t("loading")}</div>
      ) : (
        <>
          <div className="panel">
            <div className="label">{t("connectRequest")}</div>
            <div className="mono" style={{ color: "var(--violet2)" }}>{req.origin}</div>
          </div>
          <div className="label" style={{ marginTop: 14 }}>{t("chooseAccount")}</div>
          <div style={{ marginTop: 8 }}>
            {req.accounts.map((addr, i) => (
              <div key={addr} className={`acct-item ${selected === i ? "sel" : ""}`} onClick={() => setSelected(i)}>
                <span className="radio" />
                <div className="grow">
                  <div>#{i} · <span className="mono">{shortAddr(addr)}</span></div>
                  <div className="muted mono">{formatEth(balances[addr] ?? "0x0")} ETH</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-ghost grow" onClick={cancel}>{t("cancel")}</button>
            <button className="btn btn-primary grow" onClick={connect}>{t("connect")}</button>
          </div>
        </>
      )}
    </div>
  );
}
