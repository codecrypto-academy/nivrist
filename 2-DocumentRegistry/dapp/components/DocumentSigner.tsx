"use client";

import { useState } from "react";
import { PenLine, ShieldCheck, Loader2, Upload } from "lucide-react";
import FileUploader from "./FileUploader";
import { useWallet } from "@/contexts/MetaMaskContext";
import { useContract } from "@/hooks/useContract";

type Status = { kind: "idle" | "error" | "success"; msg?: string };

export default function DocumentSigner() {
  const { account, signHash, isConnected } = useWallet();
  const { storeDocumentHash, isDocumentStored } = useContract();

  const [hash, setHash] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function reset() {
    setSignature(null);
    setTxHash(null);
    setStatus({ kind: "idle" });
  }

  async function handleSign() {
    if (!hash) return;
    if (!confirm(`You are about to sign this document hash with ${account}:\n\n${hash}`)) return;
    try {
      setBusy(true);
      const sig = await signHash(hash);
      setSignature(sig);
      setStatus({ kind: "success", msg: "Document signed. Review the signature, then store it on-chain." });
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleStore() {
    if (!hash || !signature || !account) return;
    try {
      setBusy(true);
      if (await isDocumentStored(hash)) {
        setStatus({ kind: "error", msg: "This document is already stored on-chain." });
        return;
      }
      const timestamp = Math.floor(Date.now() / 1000);
      if (!confirm(`Store this document on the blockchain?\n\nHash: ${hash}\nSigner: ${account}`)) return;
      const tx = await storeDocumentHash(hash, timestamp, signature, account);
      setTxHash(tx);
      setStatus({ kind: "success", msg: "Stored on-chain successfully!" });
    } catch (e) {
      setStatus({ kind: "error", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Upload &amp; Sign</h2>
        <p className="text-sm text-slate-500">Hash a file, sign it with your wallet, and anchor it on-chain.</p>
      </div>

      <FileUploader
        onHash={(h) => {
          setHash(h);
          reset();
        }}
      />

      {status.kind !== "idle" && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            status.kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {status.msg}
        </p>
      )}

      {signature && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Signature</p>
          <p className="mono text-indigo-600">{signature}</p>
        </div>
      )}

      {txHash && (
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-600">Transaction hash</p>
          <p className="mono text-emerald-700">{txHash}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          onClick={handleSign}
          disabled={!isConnected || !hash || busy || !!signature}
        >
          {busy && !signature ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          Sign Document
        </button>
        <button
          className="btn-secondary"
          onClick={handleStore}
          disabled={!isConnected || !signature || busy || !!txHash}
        >
          {busy && signature ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Store on Blockchain
        </button>
      </div>

      {!isConnected && (
        <p className="flex items-center gap-2 text-sm text-amber-600">
          <ShieldCheck className="h-4 w-4" /> Connect a wallet to sign and store.
        </p>
      )}
    </div>
  );
}
