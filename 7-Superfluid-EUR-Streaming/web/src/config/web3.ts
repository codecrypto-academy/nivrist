// Configuración de contratos y red. En un fork de mainnet la Chain ID es 1 (no 31337).
// Rellena EUR_ADDRESS y EURX_ADDRESS con lo que imprima DeployAll (pasos 2-3 del PDF).

export const EUR_ADDRESS = process.env.NEXT_PUBLIC_EUR_ADDRESS || "0x0000000000000000000000000000000000000000";
export const EURX_ADDRESS = process.env.NEXT_PUBLIC_EURX_ADDRESS || "0x0000000000000000000000000000000000000000";

// El fork corre en localhost:8545 pero reporta la Chain ID de mainnet (1).
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "1");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

// 2000 EUR/mes en wei/segundo → 2000e18 / (30·24·60·60) = 771604938271604 wei/s.
export const FLOW_RATE_2000_EUR_MONTH = "771604938271604";
export const SECONDS_PER_MONTH = 2_592_000; // 30·24·60·60

/** EUR/mes (número) → flow rate en wei/segundo (string). */
export function eurPerMonthToFlowRate(eurPerMonth: number): string {
  // (eur * 1e18) / segundosPorMes, en enteros grandes
  const perMonthWei = BigInt(Math.round(eurPerMonth * 1e6)) * 10n ** 12n; // eur*1e18 con precisión
  return (perMonthWei / BigInt(SECONDS_PER_MONTH)).toString();
}

/** wei/segundo (string) → EUR/mes (número) para mostrar. */
export function flowRateToEurPerMonth(weiPerSecond: string): number {
  const perMonthWei = BigInt(weiPerSecond) * BigInt(SECONDS_PER_MONTH);
  return Number(perMonthWei) / 1e18;
}

export function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
