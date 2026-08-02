"use client";

import { ethers } from "ethers";
import { DAO_ABI } from "./dao.abi";
import {
  CHAIN_ID,
  DAO_ADDRESS,
  FORWARDER_ADDRESS,
  FORWARDER_DOMAIN_NAME,
  FORWARDER_DOMAIN_VERSION,
  FORWARD_REQUEST_TYPES,
  RPC_URL,
  VoteType,
} from "./config";
import { forwarderContract } from "./dao";

export interface SignedForwardRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  data: string;
}

/**
 * Build a vote() meta-transaction, sign it with MetaMask (EIP-712, no gas), and POST it
 * to the relayer. Returns the relayed transaction hash.
 */
export async function signAndRelayVote(
  signer: ethers.JsonRpcSigner,
  proposalId: number,
  voteType: VoteType
): Promise<string> {
  const from = await signer.getAddress();

  // Encode the DAO.vote(proposalId, voteType) call.
  const daoIface = new ethers.Interface(DAO_ABI as unknown as ethers.InterfaceAbi);
  const data = daoIface.encodeFunctionData("vote", [proposalId, voteType]);

  // Read the caller's current forwarder nonce (via a plain RPC provider).
  const readProvider = new ethers.JsonRpcProvider(RPC_URL);
  const forwarder = forwarderContract(FORWARDER_ADDRESS, readProvider);
  const nonce: bigint = await forwarder.getNonce(from);

  const request = {
    from,
    to: DAO_ADDRESS,
    value: 0n,
    gas: 500_000n,
    nonce,
    data,
  };

  const domain = {
    name: FORWARDER_DOMAIN_NAME,
    version: FORWARDER_DOMAIN_VERSION,
    chainId: CHAIN_ID,
    verifyingContract: FORWARDER_ADDRESS,
  };

  // MetaMask signs the typed data — this does NOT cost gas.
  const signature = await signer.signTypedData(
    domain,
    FORWARD_REQUEST_TYPES as unknown as Record<string, ethers.TypedDataField[]>,
    request
  );

  const payload: SignedForwardRequest = {
    from: request.from,
    to: request.to,
    value: request.value.toString(),
    gas: request.gas.toString(),
    nonce: request.nonce.toString(),
    data: request.data,
  };

  const res = await fetch("/api/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request: payload, signature }),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "Relayer error");
  return body.txHash as string;
}
