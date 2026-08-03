# CodeCrypto Wallet — Chrome Extension (Ethereum)

> **ES** · Wallet de Ethereum como extensión de Chrome (estilo MetaMask), Manifest V3, React 19 +
> TypeScript + Ethers.js v6. Implementa EIP-1193, EIP-712, EIP-1559 y EIP-6963.
>
> **EN** · An Ethereum wallet Chrome extension (MetaMask-style), Manifest V3, React 19 +
> TypeScript + Ethers.js v6. Implements EIP-1193, EIP-712, EIP-1559 and EIP-6963.

## Arquitectura / Architecture

La firma ocurre **solo en el service worker** (background). El popup y las páginas de
confirmación son solo UI y delegan toda la criptografía por mensajes. / Signing happens **only
in the service worker**; the popup and confirmation pages are UI-only and delegate all crypto.

```
Página web / dApp ──window.codecrypto (EIP-1193)──▶ inject.js
        ▲                                              │ postMessage
        │ eventos                                      ▼
        │                                        content-script.js
        │                                              │ chrome.runtime
        │                                              ▼
   Popup (App.tsx) ──chrome.runtime.sendMessage──▶ background.ts  ◀── USA ethers
   Connect.tsx / Notification.tsx (aprobar/rechazar)   │  (deriva, balance, firma tx/EIP-712)
                                                        ▼
                                                 chrome.storage.local
```

- **`src/background.ts`** — service worker (ethers): `wallet_deriveAccounts`, `eth_requestAccounts`,
  `eth_accounts`, `eth_chainId`, `eth_getBalance`, `eth_sendTransaction` (EIP-1559),
  `eth_signTypedData_v4` (EIP-712), `personal_sign`, `wallet_switchEthereumChain`,
  `wallet_addEthereumChain`. Colas de conexión/firma, badge, notificaciones, y broadcast de
  `accountsChanged` / `chainChanged` a todas las pestañas.
- **`src/inject.ts`** — provider `window.codecrypto` (EIP-1193) + anuncio EIP-6963.
- **`src/content-script.ts`** — relay página ↔ background.
- **`src/App.tsx`** — popup (bilingüe ES/EN): cargar/importar mnemonic, 5 cuentas HD, balance
  cada 5 s, cambio de cuenta/red, transferencias internas, logs, reset.
- **`src/Connect.tsx`** — el usuario elige qué cuenta compartir con la dApp.
- **`src/Notification.tsx`** — aprobar/rechazar (no firma).
- **`src/manifest.ts`** — Manifest V3 tipado → genera `dist/manifest.json` en el build.

## Ejecutar / Run

```bash
# 1) blockchain local / local chain (Hardhat o Anvil, chainId 31337)
npx hardhat node          # o / or:  anvil

# 2) build (genera dist/ cargable)
npm install
npm run build

# 3) cargar en Chrome / load in Chrome
#    chrome://extensions  →  Modo desarrollador ON  →  Cargar sin empaquetar  →  dist/
```

Luego / Then:
1. Click en el icono de la extensión / Click the extension icon.
2. Pega la frase de prueba / Paste the test phrase (botón "Usar frase de prueba"):
   `test test test test test test test test test test test junk`
3. **Cargar wallet** → aparecen 5 cuentas con 10 000 ETH (Hardhat).
4. Abre `test.html` (sírvelo, p. ej. `npx serve .`) y prueba conectar / tx / firma.

### Frase de prueba / Test mnemonic
`test test test test test test test test test test test junk` → deriva las cuentas estándar de
Hardhat (verificado: `m/44'/60'/0'/0/i` → `0xf39F…`, `0x7099…`, `0x3C44…`, `0x90F7…`, `0x15d3…`).

## Estándares / Standards

| EIP | Dónde / Where |
|---|---|
| **EIP-1193** | provider `window.codecrypto` (`request`/`on`/`removeListener`) en `inject.ts` |
| **EIP-712** | `eth_signTypedData_v4` → `wallet.signTypedData` en `background.ts` |
| **EIP-1559** | `getFeeData()` → `maxFeePerGas` / `maxPriorityFeePerGas` al enviar tx |
| **EIP-6963** | anuncio `eip6963:announceProvider` en `inject.ts` |
| **BIP-39/44** | `Mnemonic.fromPhrase` + `HDNodeWallet.fromMnemonic(path)` |

## Seguridad / Security ⚠️

Solo para desarrollo. El mnemonic se guarda sin cifrar (aceptable solo en local) y solo es
accesible desde el background. Para producción haría falta cifrado con contraseña (PBKDF2),
auto-lock y auditoría. / Development only — unencrypted mnemonic (local-only), background-scoped.

## Notas / Notes

- 100% TypeScript. `background.js` empaqueta ethers localmente (sin CDN → cumple CSP MV3).
- `content-script.js` e `inject.js` se compilan sin imports (cargables como scripts clásicos).
- Bilingüe ES/EN con toggle en cada pantalla.
