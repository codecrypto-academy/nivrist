import { useEffect, useState } from "react";
import "./App.css";
import { useI18n } from "./lib/i18n";
import { storageGet, NETWORKS, shortAddr, formatEth } from "./lib/rpc";

interface PendingRequest {
  approvalId: number;
  method: string;
  params: unknown[];
  chainId: string;
}

// Esta página SOLO aprueba/rechaza. El background firma después de la aprobación.
export default function Notification() {
  const { t, lang, toggle } = useI18n();
  const [req, setReq] = useState<PendingRequest | null>(null);

  useEffect(() => {
    (async () => {
      const r = await storageGet<Record<string, PendingRequest>>(["codecrypto_pending_request"]);
      if (r["codecrypto_pending_request"]) setReq(r["codecrypto_pending_request"]);
    })();
  }, []);

  function respond(success: boolean) {
    if (req)
      chrome.runtime.sendMessage({
        type: "SIGN_RESPONSE",
        success,
        error: success ? undefined : "User rejected",
        approvalId: req.approvalId,
      });
    window.close();
  }

  const isTx = req?.method === "eth_sendTransaction";
  const tx = isTx ? (req!.params[0] as Record<string, string>) : null;
  const typed = req?.method === "eth_signTypedData_v4" ? JSON.parse((req!.params[1] as string) || "{}") : null;

  return (
    <div className="page">
      <div className="between">
        <div className="brand"><img className="logo" src="vite.svg" alt="" /> CodeCrypto</div>
        <button className="btn btn-ghost btn-sm" onClick={toggle}>{lang.toUpperCase()}</button>
      </div>

      {!req ? (
        <div className="panel muted">{t("noRequest")}</div>
      ) : (
        <>
          <div className="panel">
            <div className="label">{isTx ? t("confirmTx") : t("confirmSign")}</div>

            {isTx && tx && (
              <div className="stack" style={{ marginTop: 8 }}>
                <div>
                  <span className="label">{t("to")}</span>
                  <div className="mono">{tx.to}</div>
                </div>
                <div>
                  <span className="label">{t("value")}</span>
                  <div className="balance" style={{ fontSize: 22 }}>{formatEth(tx.value || "0x0")} <small>ETH</small></div>
                </div>
                {tx.data && tx.data !== "0x" && (
                  <div>
                    <span className="label">{t("data")}</span>
                    <div className="mono muted">{shortAddr(tx.data)}</div>
                  </div>
                )}
                <div>
                  <span className="label">{t("network")}</span>
                  <div>{NETWORKS[req.chainId] || req.chainId}</div>
                </div>
              </div>
            )}

            {typed && (
              <div className="stack" style={{ marginTop: 8 }}>
                <div>
                  <span className="label">Domain</span>
                  <div className="mono">{typed.domain?.name} v{typed.domain?.version} · chain {typed.domain?.chainId}</div>
                </div>
                <div>
                  <span className="label">{t("message")}</span>
                  <pre className="logs" style={{ maxHeight: 220 }}>{JSON.stringify(typed.message, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-danger grow" onClick={() => respond(false)}>{t("reject")}</button>
            <button className="btn btn-mint grow" onClick={() => respond(true)}>{t("approve")}</button>
          </div>
        </>
      )}
    </div>
  );
}
