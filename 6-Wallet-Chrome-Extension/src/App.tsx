import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { useI18n } from "./lib/i18n";
import {
  sendRPC,
  storageGet,
  storageSet,
  storageClear,
  STORAGE_KEYS as K,
  NETWORKS,
  TEST_MNEMONIC,
  shortAddr,
  formatEth,
  ethToWeiHex,
} from "./lib/rpc";

interface Log {
  kind: "call" | "event" | "error" | "ok";
  text: string;
  ts: number;
}

const LOGS_KEY = "codecrypto_logs";

export default function App() {
  const { t, lang, toggle } = useI18n();
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [balance, setBalance] = useState("0x0");
  const [chainId, setChainId] = useState("0x7a69");
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toAccount, setToAccount] = useState(1);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const log = useCallback((kind: Log["kind"], text: string) => {
    setLogs((prev) => {
      const next = [{ kind, text, ts: Date.now() }, ...prev].slice(0, 100);
      localStorage.setItem(LOGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const rpc = useCallback(
    async (method: string, params: unknown[] = []) => {
      log("call", `→ ${method}`);
      try {
        const res = await sendRPC(method, params);
        return res;
      } catch (e) {
        log("error", `✖ ${method}: ${(e as Error).message}`);
        throw e;
      }
    },
    [log]
  );

  const refreshBalance = useCallback(
    async (addr: string) => {
      try {
        const bal = (await sendRPC("eth_getBalance", [addr, "latest"])) as string;
        setBalance(bal);
      } catch {
        /* nodo puede estar caído */
      }
    },
    []
  );

  const loadFromMnemonic = useCallback(
    async (phrase: string, idx: number, chain: string) => {
      const derived = (await rpc("wallet_deriveAccounts", [phrase, 5])) as string[];
      setAccounts(derived);
      setCurrentIndex(idx);
      setChainId(chain);
      setMnemonic(phrase);
      setIsLoaded(true);
      await storageSet({
        [K.mnemonic]: phrase,
        [K.accounts]: derived,
        [K.current]: String(idx),
        [K.chainId]: chain,
      });
      log("ok", `✓ wallet cargada · ${derived.length} cuentas`);
      void refreshBalance(derived[idx]);
    },
    [rpc, log, refreshBalance]
  );

  // Carga inicial desde storage.
  useEffect(() => {
    (async () => {
      const saved = localStorage.getItem(LOGS_KEY);
      if (saved) setLogs(JSON.parse(saved));
      const r = await storageGet<Record<string, string | string[]>>([
        K.mnemonic,
        K.accounts,
        K.current,
        K.chainId,
      ]);
      if (r[K.mnemonic]) {
        try {
          await loadFromMnemonic(
            r[K.mnemonic] as string,
            Number(r[K.current] || 0),
            (r[K.chainId] as string) || "0x7a69"
          );
        } catch {
          /* mnemonic corrupto */
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling de balance cada 5s.
  useEffect(() => {
    if (!isLoaded || !accounts[currentIndex]) return;
    void refreshBalance(accounts[currentIndex]);
    pollRef.current = setInterval(() => refreshBalance(accounts[currentIndex]), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLoaded, accounts, currentIndex, refreshBalance]);

  async function handleLoad() {
    setError(null);
    try {
      await loadFromMnemonic(mnemonic.trim(), 0, chainId);
    } catch (e) {
      setError((e as Error).message.includes("Invalid") ? t("invalidMnemonic") : (e as Error).message);
    }
  }

  async function changeAccount(idx: number) {
    setCurrentIndex(idx);
    await storageSet({ [K.current]: String(idx) }); // dispara accountsChanged en background
    log("event", `⇄ accountsChanged → ${shortAddr(accounts[idx])}`);
    void refreshBalance(accounts[idx]);
  }

  async function changeChain(id: string) {
    setChainId(id);
    await storageSet({ [K.chainId]: id }); // dispara chainChanged
    log("event", `⇄ chainChanged → ${NETWORKS[id] || id}`);
    if (accounts[currentIndex]) void refreshBalance(accounts[currentIndex]);
  }

  async function handleTransfer() {
    setError(null);
    setBusy(true);
    try {
      const hash = (await rpc("eth_sendTransaction", [
        { from: accounts[currentIndex], to: accounts[toAccount], value: ethToWeiHex(amount), data: "0x" },
      ])) as string;
      log("ok", `✓ tx ${hash.slice(0, 12)}…`);
      setTimeout(() => refreshBalance(accounts[currentIndex]), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    await storageClear();
    setIsLoaded(false);
    setAccounts([]);
    setMnemonic("");
    setBalance("0x0");
    log("event", "⟲ wallet reiniciada");
  }

  function copyAddr() {
    navigator.clipboard.writeText(accounts[currentIndex]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="wallet">
      <div className="between">
        <div className="brand">
          <img className="logo" src="vite.svg" alt="" /> CodeCrypto
        </div>
        <button className="btn btn-ghost btn-sm" onClick={toggle}>{lang.toUpperCase()}</button>
      </div>

      {loading ? (
        <div className="panel muted">{t("loading")}</div>
      ) : !isLoaded ? (
        <div className="panel stack">
          <label className="label">{t("enterMnemonic")}</label>
          <textarea
            className="field"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            placeholder="word1 word2 … word12"
          />
          <span className="hint" onClick={() => setMnemonic(TEST_MNEMONIC)}>{t("useTest")}</span>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-primary btn-block" onClick={handleLoad} disabled={!mnemonic.trim()}>
            {t("loadWallet")}
          </button>
        </div>
      ) : (
        <>
          <div className="panel">
            <div className="between">
              <span className="label">{t("account")}</span>
              <button className="btn btn-ghost btn-sm" onClick={copyAddr}>{copied ? t("copied") : t("copy")}</button>
            </div>
            <select value={currentIndex} onChange={(e) => changeAccount(Number(e.target.value))}>
              {accounts.map((a, i) => (
                <option key={a} value={i}>#{i} · {shortAddr(a)}</option>
              ))}
            </select>
            <div className="mono muted" style={{ marginTop: 6 }}>{accounts[currentIndex]}</div>
            <div style={{ marginTop: 12 }}>
              <span className="label">{t("balance")}</span>
              <div className="balance">{formatEth(balance)} <small>ETH</small></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="label">{t("network")}</span>
              <select value={chainId} onChange={(e) => changeChain(e.target.value)}>
                {Object.entries(NETWORKS).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel stack">
            <span className="label">{t("transfer")}</span>
            <div className="row">
              <div className="grow">
                <label className="label">{t("to")}</label>
                <select value={toAccount} onChange={(e) => setToAccount(Number(e.target.value))}>
                  {accounts.map((a, i) => (
                    <option key={a} value={i} disabled={i === currentIndex}>#{i} · {shortAddr(a)}</option>
                  ))}
                </select>
              </div>
              <div style={{ width: 110 }}>
                <label className="label">{t("amount")}</label>
                <input className="field" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>
            </div>
            <button className="btn btn-mint btn-block" onClick={handleTransfer} disabled={busy}>
              {busy ? t("loading") : `${t("send")} ${amount} ETH`}
            </button>
            {error && <div className="error">{error}</div>}
          </div>

          <div className="panel">
            <div className="between" style={{ marginBottom: 8 }}>
              <span className="label" style={{ margin: 0 }}>{t("logs")}</span>
            </div>
            <div className="logs">
              {logs.length === 0 ? (
                <div className="log log-ok">—</div>
              ) : (
                logs.map((l, i) => <div key={i} className={`log log-${l.kind}`}>{l.text}</div>)
              )}
            </div>
          </div>

          <button className="btn btn-danger btn-block" style={{ marginTop: 12 }} onClick={reset}>
            {t("reset")}
          </button>
        </>
      )}
    </div>
  );
}
