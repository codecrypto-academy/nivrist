"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw, Loader2 } from "lucide-react";
import { useContract, type DocumentInfo } from "@/hooks/useContract";

function short(value: string, lead = 10, tail = 8) {
  if (value.length <= lead + tail) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

export default function DocumentHistory() {
  const { getAllDocuments } = useContract();
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDocs(await getAllDocuments());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-800">History</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{docs.length}</span>
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!loading && docs.length === 0 && !error && (
        <p className="py-8 text-center text-sm text-slate-400">No documents stored yet.</p>
      )}

      {docs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4 font-medium">#</th>
                <th className="py-2 pr-4 font-medium">Hash</th>
                <th className="py-2 pr-4 font-medium">Signer</th>
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 pr-4 font-medium">Signature</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => (
                <tr key={d.hash} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 text-slate-400">{i}</td>
                  <td className="py-2 pr-4 font-mono text-indigo-600" title={d.hash}>
                    {short(d.hash)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-slate-600" title={d.signer}>
                    {short(d.signer, 8, 6)}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {new Date(Number(d.timestamp) * 1000).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 font-mono text-slate-400" title={d.signature}>
                    {short(d.signature, 8, 6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
