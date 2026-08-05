# Evidencia de prueba / Test evidence

Probado sobre un **fork de mainnet** en Anvil (Chain ID 1) con los contratos reales de
Superfluid. Tested on a real mainnet fork. La wallet se conectó a la cuenta de Anvil
`0xf39F…2266` a través de un provider EIP-1193 apuntando al fork (sin MetaMask).

## 1. Balance en vivo — recibiendo un stream / Live balance — receiving a stream
`01-live-balance-recibiendo-3002.jpg`

- **LIVE BALANCE EURX: 3002.898525** (subió desde 3000 por el streaming) / rose from 3000.
- **Net flow: +2000 EUR/month** (verde = recibiendo) / receiving.
- La cuenta recibía un flow de otra cuenta a 2000 EUR/mes; su balance sube segundo a segundo.

## 2. Stream creado desde la UI / Stream created from the UI
`02-stream-creado-desde-la-ui.jpg`

- Se agregó el destinatario `0x3C44…93BC` y se pulsó **Start stream** → `createFlow` real.
- El destinatario queda **activo a 2000 EUR/month** con botón **Pause**.
- El **Net flow pasó a 0.00** (recibe 2000 y ahora envía 2000 → neto cero) y el balance bajó
  por el **depósito de seguridad** del CFA (comportamiento esperado de Superfluid).

## Verificación adicional por CLI / Additional CLI verification

También se validó a nivel de contrato (ver README principal): `DeployAll` crea EURx,
`upgrade`/`downgrade`, `createFlow`/`deleteFlow`, y el receptor recibió exactamente
`2000/(30·24) = 2.777778 EURx` en 1 hora.
