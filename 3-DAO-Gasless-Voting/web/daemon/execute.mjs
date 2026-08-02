// Execution daemon: polls the DAO for approved proposals whose deadline + safety delay
// has passed, and executes them automatically (paying gas from the relayer account).
//
// Run with:  npm run daemon      (uses --env-file=.env.local, Node 20+)
// or:        node --env-file=.env.local daemon/execute.mjs

import { ethers } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DAO_ABI = JSON.parse(readFileSync(join(__dirname, "../lib/dao.abi.json"), "utf8"));

const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const DAO_ADDRESS = process.env.DAO_ADDRESS || "";
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || "";
const INTERVAL_MS = Number(process.env.DAEMON_INTERVAL_MS || "10000");

if (!DAO_ADDRESS || !RELAYER_PRIVATE_KEY) {
  console.error("✖ Falta DAO_ADDRESS o RELAYER_PRIVATE_KEY en el entorno (.env.local)");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
// NonceManager keeps nonces correct when several proposals execute in one tick.
const signer = new ethers.NonceManager(wallet);
const dao = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

const log = (msg) => console.log(`[daemon ${new Date().toISOString()}] ${msg}`);

async function tick() {
  try {
    const [count, execDelay, treasury, block] = await Promise.all([
      dao.proposalCount(),
      dao.executionDelay(),
      dao.treasury(),
      provider.getBlock("latest"),
    ]);
    const now = BigInt(block.timestamp);

    for (let id = 1n; id <= count; id++) {
      const p = await dao.getProposal(id);
      if (p.executed) continue;

      const executableAt = p.deadline + execDelay;
      const approved = p.votesFor > p.votesAgainst;
      const timeReady = now >= executableAt;
      const funded = treasury >= p.amount;

      if (!timeReady || !approved) continue;
      if (!funded) {
        log(`⚠ Propuesta #${id} aprobada pero tesorería insuficiente (${ethers.formatEther(p.amount)} ETH)`);
        continue;
      }

      log(`▶ Ejecutando propuesta #${id} → ${ethers.formatEther(p.amount)} ETH a ${p.recipient}`);
      try {
        const tx = await dao.executeProposal(id);
        const receipt = await tx.wait();
        log(`✓ Propuesta #${id} ejecutada · tx ${receipt.hash}`);
      } catch (e) {
        log(`✖ Falló ejecución de #${id}: ${e.shortMessage || e.message}`);
      }
    }
  } catch (e) {
    log(`✖ Error en el ciclo: ${e.shortMessage || e.message}`);
  }
}

log(`Daemon iniciado · DAO ${DAO_ADDRESS} · relayer ${wallet.address} · cada ${INTERVAL_MS}ms`);
await tick();
setInterval(tick, INTERVAL_MS);
