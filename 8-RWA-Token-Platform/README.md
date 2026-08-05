# RWA Token Platform 🏛️

> Permissioned security-token platform (ERC-3643 / T-REX style) built with Foundry.
> Plataforma de _security tokens_ permisionados (estilo ERC-3643 / T-REX) construida con Foundry.

[🇬🇧 English](#-english) · [🇪🇸 Español](#-español)

---

## 🇬🇧 English

A production-grade **Real-World Asset (RWA) tokenization** platform implementing the
ERC-3643 (T-REX) permissioned-token standard from scratch: on-chain identities, a verified
investor registry, and **modular, composable compliance**. Any transfer is only allowed when the
receiver is KYC-verified, no party is frozen, the token isn't paused, and **every** compliance
module approves it.

### Highlights

- **Permissioned ERC-20** — transfers gated by identity + compliance, with agent operations
  (mint, burn, freeze, pause, forced recovery transfer).
- **On-chain identity** (ONCHAINID-style) with claims, trusted issuers and required claim topics.
- **Modular compliance** — a `ComplianceAggregator` fans out to N pluggable modules; all must pass.
- **6 compliance modules**, including a **custom Lock-up / vesting module**.
- **2 asset token types**: `RealEstateToken` (rent → on-chain dividends) and `EquityToken`
  (balance-weighted governance).
- **EIP-1167 minimal-proxy clones** for cheap identity & token deployment via factories.
- **Compliance presets** (NONE / BASIC / STANDARD / STRICT) via `CompliancePresetManager`.
- **84 tests, 94.8% line coverage.** Unit + integration + full-lifecycle scenarios.

### Architecture (short)

```
Investor wallet ──> Identity (claims) ──registered in──> IdentityRegistry
                                                              │ isVerified()
                                                              ▼
        Agent ──mint/transfer──> Token (ERC-3643) ──canTransfer──> ComplianceAggregator
                                       │                                   │ fans out
                                       │                        ┌──────────┼──────────┐
                                  hooks│                    MaxBalance  Whitelist  Lock-up ...
```

Full detail in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

### Quick start

```bash
forge install           # deps (forge-std, openzeppelin-contracts)
forge build
forge test              # 84 tests
forge coverage          # ~95% lines
```

### Deploy (local anvil)

```bash
anvil                                   # terminal 1
# terminal 2 — infra only:
forge script script/DeployAll.s.sol  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
# or full end-to-end demo (onboards an investor + issues a token):
forge script script/DeployDemo.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

### Issuing a token in 3 steps

```solidity
// 1. deploy infra: IdentityRegistry + TokenCloneFactory (see DeployAll)
// 2. onboard an investor (KYC)
address id = idFactory.createIdentity(investor);
identity.addClaim(KYC_TOPIC, issuer, "");     // by a trusted issuer
registry.registerIdentity(investor, id, 840); // country = US

// 3. issue a security token with compliance in one call
(address token, address compliance) = tokenFactory.createTokenWithCompliance(
    tokenFactory.tokenImplementation(),
    "Acme Security", "ACME", 18, admin, address(registry),
    /*maxBalance*/ 1_000_000e18, /*maxHolders*/ 100, /*lockupSeconds*/ 0
);
Token(token).mint(investor, 10_000e18);
```

---

## 🇪🇸 Español

Plataforma de **tokenización de activos del mundo real (RWA)** de nivel producción que implementa
el estándar de tokens permisionados ERC-3643 (T-REX) desde cero: identidades _on-chain_, registro
de inversores verificados y **compliance modular y componible**. Una transferencia solo se permite
si el receptor está verificado (KYC), ninguna parte está congelada, el token no está en pausa y
**todos** los módulos de compliance la aprueban.

### Lo destacado

- **ERC-20 permisionado** — transferencias restringidas por identidad + compliance, con operativa
  de agente (emitir, quemar, congelar, pausar, transferencia forzada de recuperación).
- **Identidad on-chain** (estilo ONCHAINID) con claims, _trusted issuers_ y topics requeridos.
- **Compliance modular** — un `ComplianceAggregator` reparte a N módulos; todos deben aprobar.
- **6 módulos de compliance**, incluido un **módulo Lock-up / vesting personalizado**.
- **2 tipos de token de activo**: `RealEstateToken` (renta → dividendos on-chain) y `EquityToken`
  (gobernanza ponderada por balance).
- **Clones EIP-1167** para desplegar identidades y tokens de forma barata vía factories.
- **Presets de compliance** (NONE / BASIC / STANDARD / STRICT) con `CompliancePresetManager`.
- **84 tests, 94.8% de cobertura de líneas.** Unitarios + integración + ciclo de vida completo.

### Arranque rápido

```bash
forge install
forge build
forge test              # 84 tests
forge coverage          # ~95% líneas
```

### Despliegue (anvil local)

```bash
anvil                                   # terminal 1
# terminal 2 — solo infra:
forge script script/DeployAll.s.sol  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
# o demo completa end-to-end (da de alta un inversor + emite un token):
forge script script/DeployDemo.s.sol --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast
```

La arquitectura completa está en **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** y el informe de
gas en **[docs/GAS_REPORT.md](docs/GAS_REPORT.md)**.

---

## Project layout / Estructura

```
src/
├── interfaces/          ICompliance, IIdentityRegistry
├── identity/            Identity (clone), IdentityRegistry
├── token/               Token (ERC-3643 base), RealEstateToken, EquityToken
├── compliance/          ComplianceAggregator, AbstractModule, CompliancePresetManager
│   └── modules/         MaxBalance, MaxHolders, Whitelist, CountryRestriction,
│                        DailyTransferLimit, Lockup (custom)
└── factory/             IdentityCloneFactory, TokenCloneFactory
script/                  DeployAll, DeployDemo
test/                    84 tests (unit + integration)
```

## Tech / Stack

Solidity `0.8.24` · Foundry (forge/anvil/cast) · OpenZeppelin 5.x (ERC20, AccessControl, Ownable,
Clones/EIP-1167).

## License

MIT.
