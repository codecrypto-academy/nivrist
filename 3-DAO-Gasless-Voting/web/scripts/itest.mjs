// Integration test of the gasless path (relayer API + daemon) against a live Anvil.
// Assumes: anvil running, contracts deployed at the deterministic addresses, and the
// Next.js server (with /api/relay) running at RELAY_URL.
import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DAO_ABI = JSON.parse(readFileSync(join(__dirname, "../lib/dao.abi.json"), "utf8"));

const RPC = "http://127.0.0.1:8545";
const RELAY_URL = process.env.RELAY_URL || "http://localhost:3010";
const DAO = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const FORWARDER = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Anvil default accounts — use acct1 for the user (acct0 is the deployer).
const A_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // acct1
const BENEFICIARY = "0x976EA74026E726554dB657fA54763abd0C3a0aa9"; // acct5

// Disable ethers' short-lived response cache + request batching so repeated
// getBalance/getBlockNumber reads reflect the latest state each time.
const provider = new ethers.JsonRpcProvider(RPC, undefined, {
  cacheTimeout: -1,
  batchMaxCount: 1,
});
const walletA = new ethers.Wallet(A_KEY, provider);
// NonceManager tracks the nonce locally so back-to-back txs don't race.
const signerA = new ethers.NonceManager(walletA);
const daoA = new ethers.Contract(DAO, DAO_ABI, signerA);

const FW_ABI = ["function getNonce(address) view returns (uint256)"];
const forwarder = new ethers.Contract(FORWARDER, FW_ABI, provider);

const TYPES = {
  ForwardRequest: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
  ],
};

let failures = 0;
function check(cond, label) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
}

async function main() {
  const net = await provider.getNetwork();

  // 1. Fund the DAO from account A.
  await (await daoA.fundDAO({ value: ethers.parseEther("10") })).wait();
  check((await daoA.getUserBalance(walletA.address)) === ethers.parseEther("10"), "fundDAO acredita 10 ETH");

  // 2. Create a proposal. Use a generous margin — Anvil advances block time in real
  //    seconds, so a tiny window can already be "in the past" by mining time.
  const now = (await provider.getBlock("latest")).timestamp;
  const deadline = now + 3600;
  console.log(`  (now=${now} deadline=${deadline})`);
  await (await daoA.createProposal(BENEFICIARY, ethers.parseEther("2"), deadline)).wait();
  const id = Number(await daoA.proposalCount());
  check(id >= 1, `propuesta creada (#${id})`);

  // 3. Sign a gasless vote (For=0) and relay it via the API.
  const iface = new ethers.Interface(DAO_ABI);
  const data = iface.encodeFunctionData("vote", [id, 0]);
  const nonce = await forwarder.getNonce(walletA.address);
  const request = {
    from: walletA.address,
    to: DAO,
    value: 0n,
    gas: 500000n,
    nonce,
    data,
  };
  const domain = {
    name: "MinimalForwarder",
    version: "1",
    chainId: Number(net.chainId),
    verifyingContract: FORWARDER,
  };
  const signature = await walletA.signTypedData(domain, TYPES, request);

  const payload = {
    request: {
      from: request.from,
      to: request.to,
      value: request.value.toString(),
      gas: request.gas.toString(),
      nonce: request.nonce.toString(),
      data: request.data,
    },
    signature,
  };
  const res = await fetch(`${RELAY_URL}/api/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  check(res.ok && !!body.txHash, `relayer aceptó el voto gasless (tx ${body.txHash?.slice(0, 12)}…)`);

  const p = await daoA.getProposal(id);
  check(Number(p.votesFor) === 1, "voto contado (votesFor == 1) vía _msgSender del forwarder");

  // 4. Move past deadline + executionDelay, then let the DAEMON logic execute it.
  const execDelay = Number(await daoA.executionDelay());
  await provider.send("evm_increaseTime", [3600 + execDelay + 5]);
  await provider.send("evm_mine", []);

  const blockBefore = await provider.getBlockNumber();
  // Inline daemon step: relayer executes the approved proposal.
  const relayer = new ethers.Wallet(
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6", // acct9
    provider
  );
  const daoR = new ethers.Contract(DAO, DAO_ABI, relayer);
  await (await daoR.executeProposal(id)).wait();
  const blockAfter = await provider.getBlockNumber();
  // Read at explicit block tags — ethers v6 caches same-key getBalance calls briefly.
  const beforeBal = await provider.getBalance(BENEFICIARY, blockBefore);
  const afterBal = await provider.getBalance(BENEFICIARY, blockAfter);
  console.log(`  (before=${ethers.formatEther(beforeBal)} after=${ethers.formatEther(afterBal)} diff=${ethers.formatEther(afterBal - beforeBal)})`);
  check(afterBal - beforeBal === ethers.parseEther("2"), "daemon ejecutó: beneficiario recibió 2 ETH");
  check((await daoA.getProposal(id)).executed === true, "propuesta marcada como ejecutada");

  console.log(failures === 0 ? "\n✅ Integración gasless OK" : `\n❌ ${failures} fallos`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Error:", e.shortMessage || e.message);
  process.exit(1);
});
