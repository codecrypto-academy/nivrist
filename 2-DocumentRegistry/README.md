# ETH Document Registry — dApp

Aplicación descentralizada para **almacenar y verificar la autenticidad de documentos** sobre Ethereum. El sistema calcula el hash `keccak256` de un archivo, lo firma con ECDSA usando una wallet, y ancla `hash + firma + timestamp + firmante` de forma inmutable en un smart contract. Cualquiera puede luego verificar que un archivo fue firmado por una dirección concreta.

- **Smart Contracts:** Solidity 0.8.24 + Foundry + OpenZeppelin (ECDSA)
- **Frontend:** Next.js 14 (App Router) + TypeScript + Ethers.js v6 + Tailwind
- **Red local:** Anvil (nodo Ethereum, chainId 31337)

---

## 📁 Estructura

```
CodeCrypto/
├── sc/                     # Smart contracts (Foundry)
│   ├── src/DocumentRegistry.sol
│   ├── test/DocumentRegistry.t.sol   # 12 tests
│   └── script/Deploy.s.sol
└── dapp/                   # Frontend (Next.js)
    ├── app/                # layout + page con tabs
    ├── components/         # FileUploader, DocumentSigner, DocumentVerifier, DocumentHistory, WalletSelector
    ├── contexts/           # MetaMaskContext (deriva 10 wallets de Anvil)
    ├── hooks/              # useContract
    └── lib/abi.ts          # ABI del contrato
```

---

## 🧑‍🏫 Para evaluar (inicio rápido)

### Requisitos
- Node.js 18+
- [Foundry](https://book.getfoundry.sh/) (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)

### Opción A — con `make` (recomendado)
```bash
make setup     # instala libs de Foundry + npm, compila y corre los 12 tests
```
Luego, en **3 terminales**:
```bash
make anvil     # Terminal 1 — nodo local
make deploy    # Terminal 2 — despliega el contrato
make dev       # Terminal 3 — frontend en http://localhost:3000
```
Otros targets: `make test`, `make coverage`, `make build`, `make clean` (ver `make help`).

### Opción B — manual (3 terminales)

### Terminal 1 — Nodo local
```bash
anvil
```

### Terminal 2 — Instalar dependencias del contrato y desplegar
`sc/lib/` está en `.gitignore`, así que tras clonar hay que reinstalar las librerías:
```bash
cd sc
forge install foundry-rs/forge-std --no-git
forge install OpenZeppelin/openzeppelin-contracts --no-git
forge build && forge test -vv
```
Luego despliega:
```bash
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
La primera vez, la dirección desplegada es la determinista `0x5FbDB2315678afecb367f032d93F642f64180aa3`. Si cambia, actualízala en `dapp/.env.local`.

### Terminal 3 — Frontend
```bash
cd dapp
cp .env.example .env.local   # ajusta NEXT_PUBLIC_CONTRACT_ADDRESS si hace falta
npm install
npm run dev
```
Abre http://localhost:3000

---

## 🧪 Tests

```bash
cd sc
forge test -vv        # 12/12 passing
forge coverage        # 100% líneas del contrato
```

---

## 🔐 Diseño del contrato

`DocumentRegistry.sol` está optimizado para gas:

- **Sin campo `bool exists`** y **sin mapping `hashExists`** redundantes.
- La existencia se deriva de `documents[hash].signer != address(0)`.

| Función | Descripción |
|---|---|
| `storeDocumentHash(hash, timestamp, signature, signer)` | Almacena un documento (revierte si ya existe) |
| `verifyDocument(hash, signer, signature) → bool` | Recupera el firmante vía ECDSA y lo compara |
| `getDocumentInfo(hash) → Document` | Devuelve el registro completo |
| `isDocumentStored(hash) → bool` | Si el documento existe |
| `getDocumentCount() → uint256` | Total de documentos |
| `getDocumentHashByIndex(index) → bytes32` | Iteración por índice |

### Firma
El frontend firma **los 32 bytes crudos** del hash (`wallet.signMessage(ethers.getBytes(hash))`), de modo que on-chain `ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(hash), sig)` recupera exactamente al firmante (EIP-191 / `personal_sign`).

---

## 🖥️ Flujo de uso

1. **Connect Wallet** → selecciona una de las 10 wallets de Anvil.
2. **Upload & Sign** → sube un archivo, se calcula su hash, fírmalo y guárdalo on-chain.
3. **Verify** → sube el mismo archivo + dirección del firmante → ✅ válido / ❌ inválido.
4. **History** → tabla con todos los documentos almacenados.

---

## ⚠️ Seguridad

El mnemonic y las claves privadas usadas aquí son las **públicas de desarrollo de Anvil** (`test test test ... junk`). **Nunca** las uses en una red real. `.env.local` está en `.gitignore`.
