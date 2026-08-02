import { ethers } from "ethers";
import { ESCROW_ADDRESS, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS } from "./addresses";

export { ESCROW_ADDRESS, TOKEN_A_ADDRESS, TOKEN_B_ADDRESS };

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "31337");

export const ESCROW_ABI = [
  "function owner() view returns (address)",
  "function addToken(address token)",
  "function getAllowedTokens() view returns (address[])",
  "function isAllowed(address) view returns (bool)",
  "function createOperation(address tokenA, address tokenB, uint256 amountA, uint256 amountB) returns (uint256)",
  "function completeOperation(uint256 operationId)",
  "function cancelOperation(uint256 operationId)",
  "function getAllOperations() view returns (tuple(uint256 id, address creator, address tokenA, address tokenB, uint256 amountA, uint256 amountB, bool active, address completedBy)[])",
  "event TokenAdded(address indexed token)",
  "event OperationCreated(uint256 indexed id, address indexed creator, address tokenA, address tokenB, uint256 amountA, uint256 amountB)",
  "event OperationCompleted(uint256 indexed id, address indexed completedBy)",
  "event OperationCancelled(uint256 indexed id)",
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export interface Operation {
  id: number;
  creator: string;
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  active: boolean;
  completedBy: string;
}

export function readProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function escrowContract(runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, runner);
}

export function erc20(address: string, runner: ethers.ContractRunner): ethers.Contract {
  return new ethers.Contract(address, ERC20_ABI, runner);
}
