"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { DAO_ADDRESS, RPC_URL } from "@/lib/config";
import { daoContract, fetchAllProposals, type ProposalView } from "@/lib/dao";
import { useWeb3 } from "@/contexts/Web3Context";

export interface DaoData {
  treasury: bigint;
  totalDeposited: bigint;
  userBalance: bigint;
  minVoteBalance: bigint;
  proposals: ProposalView[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// A read-only provider — reads never require MetaMask.
const readProvider = new ethers.JsonRpcProvider(RPC_URL);

export function useDaoData(): DaoData {
  const { account } = useWeb3();
  const [treasury, setTreasury] = useState(0n);
  const [totalDeposited, setTotalDeposited] = useState(0n);
  const [userBalance, setUserBalance] = useState(0n);
  const [minVoteBalance, setMinVoteBalance] = useState(0n);
  const [proposals, setProposals] = useState<ProposalView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!DAO_ADDRESS) {
      setError("NEXT_PUBLIC_DAO_ADDRESS no está configurada");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const dao = daoContract(DAO_ADDRESS, readProvider);
      const [t, total, min, props] = await Promise.all([
        dao.treasury(),
        dao.totalDeposited(),
        dao.minVoteBalance(),
        fetchAllProposals(dao),
      ]);
      setTreasury(t);
      setTotalDeposited(total);
      setMinVoteBalance(min);
      setProposals(props);
      setUserBalance(account ? await dao.getUserBalance(account) : 0n);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    treasury,
    totalDeposited,
    userBalance,
    minVoteBalance,
    proposals,
    loading,
    error,
    refresh,
  };
}
