// Contract-facing helpers usable from both the browser and server (relayer/daemon).
import { ethers } from "ethers";
import { DAO_ABI } from "./dao.abi";
import { FORWARDER_ABI } from "./forwarder.abi";

export interface ProposalView {
  id: number;
  proposer: string;
  recipient: string;
  amount: bigint;
  deadline: number; // unix seconds
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  executed: boolean;
}

export type ProposalStatus = "active" | "approved" | "rejected" | "executed";

export function daoContract(
  address: string,
  runner: ethers.ContractRunner
): ethers.Contract {
  return new ethers.Contract(address, DAO_ABI, runner);
}

export function forwarderContract(
  address: string,
  runner: ethers.ContractRunner
): ethers.Contract {
  return new ethers.Contract(address, FORWARDER_ABI, runner);
}

/** Normalize the tuple returned by getProposal into a typed object. */
export function toProposalView(raw: {
  id: bigint;
  proposer: string;
  recipient: string;
  amount: bigint;
  deadline: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  executed: boolean;
}): ProposalView {
  return {
    id: Number(raw.id),
    proposer: raw.proposer,
    recipient: raw.recipient,
    amount: raw.amount,
    deadline: Number(raw.deadline),
    votesFor: Number(raw.votesFor),
    votesAgainst: Number(raw.votesAgainst),
    votesAbstain: Number(raw.votesAbstain),
    executed: raw.executed,
  };
}

/** Derive a display status without an extra contract call. */
export function proposalStatus(p: ProposalView, nowSec: number): ProposalStatus {
  if (p.executed) return "executed";
  if (nowSec < p.deadline) return "active";
  return p.votesFor > p.votesAgainst ? "approved" : "rejected";
}

/** Read all proposals (1..proposalCount) via a read-only provider. */
export async function fetchAllProposals(
  dao: ethers.Contract
): Promise<ProposalView[]> {
  const count = Number(await dao.proposalCount());
  const out: ProposalView[] = [];
  for (let i = 1; i <= count; i++) {
    out.push(toProposalView(await dao.getProposal(i)));
  }
  return out;
}
