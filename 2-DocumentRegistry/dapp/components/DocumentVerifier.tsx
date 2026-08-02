"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { BadgeCheck, BadgeX, Loader2, Search } from "lucide-react";
import FileUploader from "./FileUploader";
import { useContract } from "@/hooks/useContract";

type Result =
  | { kind: "valid"; signer: string; timestamp: bigint }
  | { kind: "invalid"; reason: string }
  | { kind: "notfound" }
  | null;

export default function DocumentVerifier() {
  const { isDocumentStored, getDocumentInfo, verifyDocument } = useContract();

  const [hash, setHash] = useState<string | null>(null);
  const [signerInput, setSignerInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function handleVerify() {
    if (!hash) return;
    setResult(null);

    if (!ethers.isAddress(signerInput)) {
      setResult({ kind: "invalid", reason: "Enter a valid signer address." });
      return;
    }

    try {
      setBusy(true);
      if (!(await isDocumentStored(hash))) {
        setResult({ kind: "notfound" });
        return;
      }
      const info = await getDocumentInfo(hash);
      const cryptoOk = await verifyDocument(hash, signerInput, info.signature);
      const signerMatches = info.signer.toLowerCase() === signerInput.toLowerCase();

      if (cryptoOk && signerMatches) {
        setResult({ kind: "valid", signer: info.signer, timestamp: info.timestamp });
      } else {
        setResult({ kind: "invalid", reason: "The document was not signed by this address." });
      }
    } catch (e) {
      setResult({ kind: "invalid", reason: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Verify</h2>
        <p className="text-sm text-slate-500">Confirm a file was signed by a given address and stored on-chain.</p>
      </div>

      <FileUploader label="Select the file to verify" onHash={(h) => setHash(h)} />

      <div>
        <label className="text-sm font-medium text-slate-600">Expected signer address</label>
        <input
          value={signerInput}
          onChange={(e) => setSignerInput(e.target.value)}
          placeholder="0x..."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
        />
      </div>

      <button className="btn-primary" onClick={handleVerify} disabled={!hash || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Verify Document
      </button>

      {result?.kind === "valid" && (
        <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
          <BadgeCheck className="mt-0.5 h-5 w-5" />
          <div className="text-sm">
            <p className="font-semibold">✅ Valid document</p>
            <p className="mono mt-1">Signer: {result.signer}</p>
            <p className="mt-1">Signed: {new Date(Number(result.timestamp) * 1000).toLocaleString()}</p>
          </div>
        </div>
      )}
      {result?.kind === "invalid" && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-red-800">
          <BadgeX className="mt-0.5 h-5 w-5" />
          <div className="text-sm">
            <p className="font-semibold">❌ Invalid</p>
            <p className="mt-1">{result.reason}</p>
          </div>
        </div>
      )}
      {result?.kind === "notfound" && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Document not found on-chain.</div>
      )}
    </div>
  );
}
