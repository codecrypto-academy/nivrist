"use client";

import { useState, useCallback } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import type { Abi, Address } from "viem";

interface TxArgs {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

/**
 * Envía una tx, espera el receipt y expone estado de carga.
 * Sends a tx, waits for the receipt and exposes loading state.
 */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (tx: TxArgs): Promise<`0x${string}`> => {
      setPending(true);
      try {
        const hash = await writeContractAsync(tx as Parameters<typeof writeContractAsync>[0]);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } finally {
        setPending(false);
      }
    },
    [writeContractAsync, publicClient],
  );

  return { run, pending };
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.split("\n")[0];
    // extract solidity revert reason if present
    const rev = /reverted with reason string '([^']+)'/.exec(e.message);
    return rev ? rev[1] : m;
  }
  return "Unexpected error";
}
