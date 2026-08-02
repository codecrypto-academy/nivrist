// Shared, client-safe configuration read from public env vars.
export const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || "";
export const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || "";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

// EIP-712 domain of the MinimalForwarder — MUST match the contract's
// EIP712("MinimalForwarder", "1") constructor.
export const FORWARDER_DOMAIN_NAME = "MinimalForwarder";
export const FORWARDER_DOMAIN_VERSION = "1";

// EIP-712 types for a ForwardRequest (matches the struct in MinimalForwarder.sol).
export const FORWARD_REQUEST_TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
  ],
} as const;

export enum VoteType {
  For = 0,
  Against = 1,
  Abstain = 2,
}

export const VOTE_LABELS: Record<VoteType, string> = {
  [VoteType.For]: "A favor",
  [VoteType.Against]: "En contra",
  [VoteType.Abstain]: "Abstención",
};
