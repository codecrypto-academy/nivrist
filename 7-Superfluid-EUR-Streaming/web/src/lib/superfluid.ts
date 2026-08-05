// Integración con Superfluid vía @superfluid-finance/sdk-core (requiere ethers v5).
// Todas las operaciones de streaming pasan por aquí: upgrade/downgrade y gestión de flows.
import { ethers } from "ethers";
import { Framework, type WrapperSuperToken } from "@superfluid-finance/sdk-core";
import { CHAIN_ID, EUR_ADDRESS, EURX_ADDRESS } from "@/config/web3";

// ABI mínimo de EUR (ERC20) para approve/balance.
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

let cachedFramework: Framework | null = null;

export async function getFramework(provider: ethers.providers.Provider): Promise<Framework> {
  if (cachedFramework) return cachedFramework;
  // En un fork de mainnet, chainId=1 → el resolver de Superfluid encuentra Host y CFA.
  cachedFramework = await Framework.create({ chainId: CHAIN_ID, provider });
  return cachedFramework;
}

// EURx es un wrapper super token (envuelve EUR) → loadWrapperSuperToken expone upgrade/downgrade.
export async function getEuroX(provider: ethers.providers.Provider): Promise<WrapperSuperToken> {
  const sf = await getFramework(provider);
  return sf.loadWrapperSuperToken(EURX_ADDRESS);
}

/** Balance de EUR (ERC20 subyacente). */
export async function getEurBalance(provider: ethers.providers.Provider, account: string): Promise<string> {
  const eur = new ethers.Contract(EUR_ADDRESS, ERC20_ABI, provider);
  const bal: ethers.BigNumber = await eur.balanceOf(account);
  return ethers.utils.formatEther(bal);
}

/** Balance de EURx (Super Token) — realtime: sube cada segundo si eres receptor de un flow. */
export async function getEuroXBalance(provider: ethers.providers.Provider, account: string): Promise<string> {
  const eurx = await getEuroX(provider);
  const bal = await eurx.balanceOf({ account, providerOrSigner: provider });
  return ethers.utils.formatEther(bal);
}

/** EUR → EURx (wrap). Aprueba primero al Super Token y luego hace upgrade. */
export async function upgradeToEuroX(signer: ethers.Signer, amountEth: string): Promise<void> {
  const amount = ethers.utils.parseEther(amountEth);
  const eur = new ethers.Contract(EUR_ADDRESS, ERC20_ABI, signer);
  const owner = await signer.getAddress();
  const allowance: ethers.BigNumber = await eur.allowance(owner, EURX_ADDRESS);
  if (allowance.lt(amount)) {
    const txA = await eur.approve(EURX_ADDRESS, amount);
    await txA.wait();
  }
  const eurx = await getEuroX(signer.provider!);
  const op = eurx.upgrade({ amount: amount.toString() });
  const tx = await op.exec(signer);
  await tx.wait();
}

/** EURx → EUR (unwrap). */
export async function downgradeFromEuroX(signer: ethers.Signer, amountEth: string): Promise<void> {
  const amount = ethers.utils.parseEther(amountEth);
  const eurx = await getEuroX(signer.provider!);
  const tx = await eurx.downgrade({ amount: amount.toString() }).exec(signer);
  await tx.wait();
}

/** Crea un flow (stream continuo) hacia `receiver` a `flowRate` wei/segundo. */
export async function createFlow(signer: ethers.Signer, receiver: string, flowRate: string): Promise<void> {
  const sender = await signer.getAddress();
  const eurx = await getEuroX(signer.provider!);
  const tx = await eurx.createFlow({ sender, receiver, flowRate }).exec(signer);
  await tx.wait();
}

/** Actualiza el flow rate de un stream existente. */
export async function updateFlow(signer: ethers.Signer, receiver: string, flowRate: string): Promise<void> {
  const sender = await signer.getAddress();
  const eurx = await getEuroX(signer.provider!);
  const tx = await eurx.updateFlow({ sender, receiver, flowRate }).exec(signer);
  await tx.wait();
}

/** Elimina (pausa) un flow. */
export async function deleteFlow(signer: ethers.Signer, receiver: string): Promise<void> {
  const sender = await signer.getAddress();
  const eurx = await getEuroX(signer.provider!);
  const tx = await eurx.deleteFlow({ sender, receiver }).exec(signer);
  await tx.wait();
}

export interface FlowInfo {
  flowRate: string; // wei/segundo (0 si no hay flow)
  deposit: string;
  updatedAt: number;
}

/** Consulta el flow sender→receiver. */
export async function getFlow(
  provider: ethers.providers.Provider,
  sender: string,
  receiver: string
): Promise<FlowInfo> {
  const eurx = await getEuroX(provider);
  const f = await eurx.getFlow({ sender, receiver, providerOrSigner: provider });
  return {
    flowRate: f.flowRate,
    deposit: f.deposit,
    updatedAt: Number(f.timestamp ? new Date(f.timestamp).getTime() / 1000 : 0),
  };
}

/** Net flow del usuario (suma de todos sus flows entrantes/salientes) en wei/segundo. */
export async function getNetFlow(provider: ethers.providers.Provider, account: string): Promise<string> {
  const eurx = await getEuroX(provider);
  return eurx.getNetFlow({ account, providerOrSigner: provider });
}

/** Balance de EURx en wei (bigint como string) — base para el contador en vivo. */
export async function getEuroXBalanceWei(provider: ethers.providers.Provider, account: string): Promise<string> {
  const eurx = await getEuroX(provider);
  const bal = await eurx.balanceOf({ account, providerOrSigner: provider });
  return bal; // ya viene como string decimal de wei
}

/** Balance realtime del super token (alias del enunciado). Devuelve wei como string. */
export async function getRealtimeBalance(provider: ethers.providers.Provider, account: string): Promise<string> {
  return getEuroXBalanceWei(provider, account);
}
