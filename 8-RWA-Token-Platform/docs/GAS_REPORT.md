# Gas Report / Informe de Gas

Generated with `forge test --gas-report` (Solidity 0.8.24, optimizer on, 200 runs).
Generado con `forge test --gas-report` (Solidity 0.8.24, optimizer activo, 200 runs).

> Numbers are indicative (avg over the test suite). Reproduce with `forge test --gas-report`.
> Los números son indicativos (media sobre la suite de tests). Reproducir con `forge test --gas-report`.

---

## Key operations / Operaciones clave

| Operation / Operación | Avg gas | Notes / Notas |
|---|---:|---|
| `Token.init` | ~159,000 | Initialize a token clone / inicializar un clon de token |
| `Token.mint` | ~107,900 | Includes `isVerified` + compliance hooks / incluye `isVerified` + hooks |
| `Token.transfer` | ~87,700 | Full restriction path / ruta completa de restricciones |
| `Token.forcedTransfer` | ~78,700 | Bypasses compliance / salta compliance |
| `Token.burn` | ~46,600 | |
| `Token.setFrozen` | ~42,700 | |
| `Token.setPaused` | ~22,000 | |
| `IdentityRegistry.isVerified` | ~19,500 | Loops required topics / recorre topics requeridos |

## Factory & compliance / Factory y compliance

| Operation / Operación | Avg gas | Notes / Notas |
|---|---:|---|
| `TokenCloneFactory.createTokenWithCompliance` | ~2,138,900 | Clone token + deploy & wire 2 modules + ownership handoff / clon + desplegar y cablear 2 módulos + traspaso de propiedad |
| `ComplianceAggregator.addModule` | ~87,600 | |
| `ComplianceAggregator.transferred` (hook) | ~24,700 | Per bound module / por módulo vinculado |
| `IdentityCloneFactory.createIdentity` | ~166,900 | EIP-1167 clone + `init` |

## Asset token types / Tipos de token de activo

| Operation / Operación | Avg gas | Notes / Notas |
|---|---:|---|
| `RealEstateToken.depositDividends` | ~41,600 | Deposit rent / depositar renta |
| `RealEstateToken.claimDividends` | ~variable | Single external `call`, CEI-safe |
| `EquityToken.createProposal` | ~92,100 | |
| `EquityToken.vote` | ~57,600 | Balance-weighted / ponderado por balance |

## Deployment costs / Costes de despliegue

| Contract / Contrato | Deploy gas |
|---|---:|
| `Token` (implementation / implementación) | ~1,400,900 |
| `ComplianceAggregator` | ~variable |

## Why clones matter / Por qué importan los clones

Deploying a full `Token` costs **~1.4M gas**. With EIP-1167 minimal proxies, each new token or
identity is a **clone** of a single implementation — the per-instance cost drops to the `init` call
(~160k gas). For an issuer launching many tokens or onboarding many investors, this is the
difference between a viable and an unviable platform.

Desplegar un `Token` completo cuesta **~1.4M de gas**. Con los minimal proxies EIP-1167, cada nuevo
token o identidad es un **clon** de una única implementación — el coste por instancia baja al de la
llamada `init` (~160k de gas). Para un emisor que lanza muchos tokens o da de alta muchos
inversores, esa es la diferencia entre una plataforma viable y una inviable.
