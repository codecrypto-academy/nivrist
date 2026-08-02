"use client";

import { useMemo } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/MetaMaskContext";
import { DOCUMENT_REGISTRY_ABI } from "@/lib/abi";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export interface DocumentInfo {
  hash: string;
  timestamp: bigint;
  signer: string;
  signature: string;
}

/**
 * Thin wrapper around the DocumentRegistry contract. Read calls use the shared
 * provider; write calls are sent through the currently connected wallet.
 */
export function useContract() {
  const { provider, getSigner } = useWallet();

  // Read-only instance (view calls, no gas).
  const readContract = useMemo(
    () => new ethers.Contract(CONTRACT_ADDRESS, DOCUMENT_REGISTRY_ABI, provider),
    [provider]
  );

  /** Store hash + signature + timestamp. Returns the mined transaction hash. */
  async function storeDocumentHash(
    hash: string,
    timestamp: number,
    signature: string,
    signer: string
  ): Promise<string> {
    const writeContract = readContract.connect(getSigner()) as ethers.Contract;
    const tx = await writeContract.storeDocumentHash(
      hash,
      BigInt(timestamp),
      signature,
      signer
    );
    const receipt = await tx.wait();
    return receipt?.hash ?? tx.hash;
  }

  async function isDocumentStored(hash: string): Promise<boolean> {
    return readContract.isDocumentStored(hash);
  }

  async function getDocumentInfo(hash: string): Promise<DocumentInfo> {
    const d = await readContract.getDocumentInfo(hash);
    return {
      hash: d.hash,
      timestamp: d.timestamp,
      signer: d.signer,
      signature: d.signature,
    };
  }

  /** Cryptographically verify a stored signature belongs to `signer`. */
  async function verifyDocument(
    hash: string,
    signer: string,
    signature: string
  ): Promise<boolean> {
    return readContract.verifyDocument(hash, signer, signature);
  }

  async function getDocumentCount(): Promise<number> {
    const n: bigint = await readContract.getDocumentCount();
    return Number(n);
  }

  async function getDocumentHashByIndex(index: number): Promise<string> {
    return readContract.getDocumentHashByIndex(BigInt(index));
  }

  /** Load every stored document (count → byIndex → info). */
  async function getAllDocuments(): Promise<DocumentInfo[]> {
    const count = await getDocumentCount();
    const out: DocumentInfo[] = [];
    for (let i = 0; i < count; i++) {
      const hash = await getDocumentHashByIndex(i);
      out.push(await getDocumentInfo(hash));
    }
    return out;
  }

  return {
    contractAddress: CONTRACT_ADDRESS,
    storeDocumentHash,
    isDocumentStored,
    getDocumentInfo,
    verifyDocument,
    getDocumentCount,
    getDocumentHashByIndex,
    getAllDocuments,
  };
}

/** keccak256 hash of a file's bytes, as a 0x-prefixed hex string. */
export async function hashFile(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return ethers.keccak256(buf);
}
