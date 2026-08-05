# Superfluid EUR Streaming

> **ES** · App de **streaming de dinero en tiempo real** con el protocolo Superfluid: envía flujos
> continuos de una stablecoin EUR a múltiples destinatarios a **2000 EUR/mes**. El balance del
> receptor sube cada segundo, sin transacciones continuas.
>
> **EN** · A **real-time money streaming** app using Superfluid: send continuous flows of a EUR
> stablecoin to multiple recipients at **2000 EUR/month**. The recipient's balance rises every
> second, with no continuous transactions.

- **Contrato / Contract:** Solidity 0.8.28 · Foundry · OpenZeppelin 5
- **Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind · **ethers.js 5.7.2** · Superfluid SDK-core

## Conceptos / Concepts

- **Super Tokens**: versiones "envueltas" de un ERC-20 con capacidad de streaming. EUR (ERC-20)
  → *upgrade* → **EURx** (Super Token) → creas flows con EURx.
- **Flow rate**: tokens por segundo. `2000 EUR / (30·24·60·60 s) = 771604938271604 wei/s` (verificado).
- **CFA (Constant Flow Agreement)**: al crear un flow se bloquea un depósito y los tokens fluyen
  automáticamente cada segundo.

## ⚠️ Requisito clave: fork de mainnet / Key requirement: mainnet fork

Este proyecto corre sobre un **fork de mainnet en Anvil** (Chain ID **1**, no 31337) para usar los
contratos de Superfluid ya desplegados en mainnet. Necesitas una **key de Alchemy (mainnet)**.

```bash
# 1) Anvil con fork de mainnet / Anvil with a mainnet fork
anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# 2) Desplegar EUR + crear el Super Token EURx / deploy EUR + create the EURx Super Token
cd sc
forge script script/DeployAll.s.sol:DeployAllScript --rpc-url http://127.0.0.1:8545 \
  --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
#   → copia EUR= y EURx= a web/.env.local

# 3) Configurar web/.env.local con las direcciones / set addresses in web/.env.local
#   NEXT_PUBLIC_EUR_ADDRESS=0x...   NEXT_PUBLIC_EURX_ADDRESS=0x...   NEXT_PUBLIC_CHAIN_ID=1

# 4) Frontend
cd web && npm install --legacy-peer-deps && npm run dev   # http://localhost:3000
```

En MetaMask añade la red local: RPC `http://localhost:8545`, **Chain ID 1** (fork). Importa una
cuenta del fork con fondos. / In MetaMask add the local network with **Chain ID 1**.

## Usar / Use

1. **Conectar wallet** (automático).
2. **Upgrade**: EUR → EURx (wrap). / Wrap EUR into EURx.
3. **Agregar destinatario** (address) y **Iniciar stream** a 2000 EUR/mes.
4. **Ver el balance subir en tiempo real** (contador en vivo + polling on-chain cada 5 s).
5. **Pausar / Reanudar** el flow cuando quieras. **Downgrade** para volver a EUR.

## Estructura / Structure

```
7-Superfluid-EUR-Streaming/
├── sc/
│   ├── src/Euro.sol              # EUR (ERC-20, mint/burn, supply 10M)
│   ├── script/DeployEuro.s.sol   # solo EUR
│   ├── script/DeployAll.s.sol    # EUR + crea EURx vía SuperTokenFactory (fork)
│   └── test/Euro.t.sol           # 11 tests, 100% cobertura de Euro.sol
└── web/
    ├── src/config/web3.ts        # direcciones + flow-rate math
    ├── src/lib/superfluid.ts     # SDK-core: upgrade/downgrade/createFlow/deleteFlow/getFlow/balance
    ├── src/lib/wallet.tsx        # MetaMask (ethers v5)
    └── src/components/Dashboard.tsx  # UI: balance en vivo, wrap, streams, pausar/reanudar
```

## Tests

```bash
cd sc && forge test        # 11/11 · Euro.sol 100% líneas
```

## Notas / Notes

- **ethers v5** (no v6): lo requiere `@superfluid-finance/sdk-core`.
- El `SuperTokenFactory` de `DeployAll.s.sol` usa la dirección de mainnet (override con env `FACTORY`);
  la firma `createERC20Wrapper(address,uint8,string,string)` es la canónica del protocolo — si tu
  versión de Superfluid difiere, ajústala. / factory address/signature are Superfluid-version specific.
- Bilingüe ES/EN con toggle. Solo para desarrollo (cuenta con clave pública de test).
