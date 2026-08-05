# Architecture / Arquitectura

[🇬🇧 English](#-english) · [🇪🇸 Español](#-español)

---

## 🇬🇧 English

This platform is a faithful, from-scratch implementation of the **ERC-3643 (T-REX)** permissioned
security-token standard, organized in four layers: **identity**, **token**, **compliance** and
**factories**.

### 1. Identity layer

| Contract | Role |
|---|---|
| `Identity` | Per-investor on-chain identity holding **claims** (KYC, accreditation, country…). One claim per topic; a claim can be added by the identity owner or the claim issuer. Cloneable (EIP-1167) — initialized via `init`, no constructor logic. |
| `IdentityRegistry` | Maps `wallet → Identity + country`. Owner configures **required claim topics** and **trusted issuers**; agents register/remove identities. `isVerified(user)` returns true only if the identity has **every** required topic, each issued by a **trusted issuer**. |
| `IdentityCloneFactory` | Deploys `Identity` clones cheaply (one implementation, N clones). |

The token calls `IdentityRegistry.isVerified(to)` on every mint and transfer — an unverified
receiver can never hold tokens.

### 2. Token layer

`Token` is the ERC-3643 base: **ERC-20 + AccessControl**, cloneable (name/symbol/decimals set in
`init`, not the constructor). Two roles:

- `DEFAULT_ADMIN_ROLE` (owner) — wiring: set identity registry, set compliance.
- `AGENT_ROLE` — operations: `mint`, `burn`, `setFrozen`, `setPaused`, `forcedTransfer`.

All transfer restrictions live in one place, the `_update` override:

```
mint/transfer/burn ─> _update:
    if normal transfer:
        require receiver isVerified
        if NOT forced:
            require !paused
            require !frozen[from] && !frozen[to]
            require compliance.canTransfer(from, to, amount)
    super._update(...)                       // move balances
    then notify compliance: created / transferred / destroyed (state hooks)
```

`forcedTransfer` is the regulatory-recovery path: it **bypasses** pause, freeze and compliance
(e.g. seizing tokens from a compromised or sanctioned wallet) but still requires a verified
receiver.

**Asset token types** extend `Token`:

- **`RealEstateToken`** — rent distribution. The agent deposits ETH via `depositDividends()`; each
  holder can `claimDividends()` their pro-rata share. Uses the **magnified-dividend-per-share**
  pattern (`magnifiedDividendPerShare` + per-account corrections in `_update`) so distribution stays
  fair even as balances change between deposits. A few wei of dust remain by integer division —
  expected and negligible.
- **`EquityToken`** — governance. The agent opens proposals; holders `vote` with weight equal to
  their balance; `executeProposal` passes if `for > against` after the deadline.

### 3. Compliance layer (modular)

`ComplianceAggregator` is itself an `ICompliance`. It holds up to `MAX_MODULES` (25) modules and:

- `canTransfer` → returns true only if **all** modules approve (AND logic).
- state hooks (`created` / `transferred` / `destroyed`) → propagated to every module. Only the
  bound token may call them (`onlyToken`).

`AbstractModule` is the base for modules: `Ownable`, empty default hooks, an `onlyCompliance`
guard so only the aggregator can mutate module state, and `setToken` / `setComplianceContract`
wiring.

| Module | Rule |
|---|---|
| `MaxBalanceCompliance` | No holder may exceed `maxBalance`. |
| `MaxHoldersCompliance` | Caps the number of non-zero holders; count maintained via hooks. |
| `WhitelistCompliance` | Both sender and receiver must be whitelisted. |
| `CountryRestrictionCompliance` | Blocks sanctioned countries; optional allow-list mode. |
| `DailyTransferLimitCompliance` | Per-user daily send cap (auto-resets each day), with VIP overrides. |
| `LockupCompliance` ⭐ **custom** | Vesting/lock-up: a holder can't **send** before their `unlockTime`; receiving applies the default lock-up on first receipt. |

`CompliancePresetManager` translates a regulatory profile into a wired module stack:

| Preset | Modules |
|---|---|
| `NONE` | (empty) |
| `BASIC` | Whitelist |
| `STANDARD` | Whitelist + MaxHolders + MaxBalance |
| `STRICT` | STANDARD + CountryRestriction + DailyTransferLimit |

### 4. Factory layer

- `IdentityCloneFactory` — one `Identity` implementation, N clones.
- `TokenCloneFactory` — clones tokens and, in `createTokenWithCompliance`, orchestrates the entire
  setup atomically: deploy aggregator → clone + `init` token → `bindToken` → deploy requested
  modules → wire each (`setToken`, `setComplianceContract`, `addModule`) → **transfer ownership of
  the aggregator and every module to the token admin**. The factory owns everything only long
  enough to wire it.

### Design decisions

- **Clones over deployments** — an issuer minting many tokens / onboarding many investors pays
  ~2.1M gas for a fully-wired token instead of redeploying full bytecode each time.
- **Aggregator + AND logic** — compliance is composable; adding a rule is `addModule`, never a
  redeploy of the token.
- **Ownership handoff in the factory** — the admin ends up in full control of their compliance
  stack, yet the wiring is done in one atomic transaction.
- **Bounded loops** — `MAX_MODULES = 25` and fixed required-topics arrays keep `canTransfer` and
  `isVerified` gas-bounded.

### Security notes

- Only the bound token can trigger state hooks (`onlyToken` / `onlyCompliance`).
- `forcedTransfer` still enforces a verified receiver — recovery can't move tokens to an
  unverified wallet.
- Clones are init-guarded (`_initialized`) against re-initialization.
- Reviewed against the project's mandatory security checklist (no secrets, access-controlled
  state-changing functions, no reentrancy on the single external `call` in `claimDividends`, which
  follows checks-effects-interactions).

---

## 🇪🇸 Español

Esta plataforma es una implementación fiel y desde cero del estándar de tokens permisionados
**ERC-3643 (T-REX)**, organizada en cuatro capas: **identidad**, **token**, **compliance** y
**factories**.

### 1. Capa de identidad

| Contrato | Rol |
|---|---|
| `Identity` | Identidad on-chain por inversor con sus **claims** (KYC, acreditación, país…). Un claim por topic; lo puede añadir el owner de la identidad o el issuer del claim. Clonable (EIP-1167), se inicializa con `init` (sin lógica en el constructor). |
| `IdentityRegistry` | Mapea `wallet → Identity + país`. El owner configura los **topics requeridos** y los **trusted issuers**; los agentes registran/eliminan identidades. `isVerified(user)` es true solo si la identidad tiene **todos** los topics requeridos, cada uno emitido por un **issuer de confianza**. |
| `IdentityCloneFactory` | Despliega clones de `Identity` de forma barata (una implementación, N clones). |

El token llama a `IdentityRegistry.isVerified(to)` en cada emisión y transferencia — un receptor no
verificado nunca puede tener tokens.

### 2. Capa de token

`Token` es la base ERC-3643: **ERC-20 + AccessControl**, clonable (name/symbol/decimals se fijan en
`init`, no en el constructor). Dos roles:

- `DEFAULT_ADMIN_ROLE` (owner) — cableado: fijar identity registry y compliance.
- `AGENT_ROLE` — operativa: `mint`, `burn`, `setFrozen`, `setPaused`, `forcedTransfer`.

Todas las restricciones de transferencia viven en un único sitio, el override de `_update`:

```
mint/transfer/burn ─> _update:
    si es transferencia normal:
        exige receptor isVerified
        si NO es forzada:
            exige !paused
            exige !frozen[from] && !frozen[to]
            exige compliance.canTransfer(from, to, amount)
    super._update(...)                        // mueve balances
    luego notifica al compliance: created / transferred / destroyed (hooks de estado)
```

`forcedTransfer` es la vía de recuperación regulatoria: **salta** pausa, congelación y compliance
(p. ej. incautar tokens de una wallet comprometida o sancionada) pero sigue exigiendo un receptor
verificado.

**Tipos de token de activo** que extienden `Token`:

- **`RealEstateToken`** — reparto de renta. El agente deposita ETH con `depositDividends()`; cada
  holder reclama su parte proporcional con `claimDividends()`. Usa el patrón de
  **dividendos-por-acción magnificados** (`magnifiedDividendPerShare` + correcciones por cuenta en
  `_update`) para que el reparto sea justo aunque los balances cambien entre depósitos. Quedan unos
  pocos wei de polvo por división entera — esperado e insignificante.
- **`EquityToken`** — gobernanza. El agente abre propuestas; los holders `vote`n con peso igual a su
  balance; `executeProposal` aprueba si `for > against` tras el deadline.

### 3. Capa de compliance (modular)

`ComplianceAggregator` es en sí mismo un `ICompliance`. Contiene hasta `MAX_MODULES` (25) módulos y:

- `canTransfer` → true solo si **todos** los módulos aprueban (lógica AND).
- hooks de estado (`created` / `transferred` / `destroyed`) → se propagan a cada módulo. Solo el
  token vinculado puede llamarlos (`onlyToken`).

`AbstractModule` es la base: `Ownable`, hooks vacíos por defecto, un guard `onlyCompliance` para que
solo el aggregator mute el estado del módulo, y el cableado `setToken` / `setComplianceContract`.

| Módulo | Regla |
|---|---|
| `MaxBalanceCompliance` | Ningún holder puede superar `maxBalance`. |
| `MaxHoldersCompliance` | Limita el número de holders con balance > 0; el conteo se mantiene vía hooks. |
| `WhitelistCompliance` | Emisor y receptor deben estar en whitelist. |
| `CountryRestrictionCompliance` | Bloquea países sancionados; modo allow-list opcional. |
| `DailyTransferLimitCompliance` | Límite diario de envío por usuario (se resetea cada día), con overrides VIP. |
| `LockupCompliance` ⭐ **custom** | Vesting/lock-up: un holder no puede **enviar** antes de su `unlockTime`; recibir aplica el lock-up por defecto en el primer ingreso. |

`CompliancePresetManager` traduce un perfil regulatorio en un stack de módulos ya cableado:

| Preset | Módulos |
|---|---|
| `NONE` | (vacío) |
| `BASIC` | Whitelist |
| `STANDARD` | Whitelist + MaxHolders + MaxBalance |
| `STRICT` | STANDARD + CountryRestriction + DailyTransferLimit |

### 4. Capa de factories

- `IdentityCloneFactory` — una implementación de `Identity`, N clones.
- `TokenCloneFactory` — clona tokens y, en `createTokenWithCompliance`, orquesta todo el setup de
  forma atómica: desplegar aggregator → clonar + `init` del token → `bindToken` → desplegar los
  módulos pedidos → cablear cada uno (`setToken`, `setComplianceContract`, `addModule`) →
  **transferir la propiedad del aggregator y de cada módulo al admin del token**. La factory es
  dueña de todo solo el tiempo justo para cablearlo.

### Decisiones de diseño

- **Clones en vez de despliegues** — un emisor que emite muchos tokens / da de alta muchos
  inversores paga ~2.1M de gas por un token totalmente cableado en lugar de redesplegar el bytecode
  completo cada vez.
- **Aggregator + lógica AND** — el compliance es componible; añadir una regla es `addModule`, nunca
  un redepliegue del token.
- **Traspaso de propiedad en la factory** — el admin acaba con control total de su stack de
  compliance, y el cableado se hace en una única transacción atómica.
- **Bucles acotados** — `MAX_MODULES = 25` y arrays fijos de topics requeridos mantienen el gas de
  `canTransfer` e `isVerified` acotado.

### Notas de seguridad

- Solo el token vinculado dispara los hooks de estado (`onlyToken` / `onlyCompliance`).
- `forcedTransfer` sigue exigiendo receptor verificado — la recuperación no puede mover tokens a una
  wallet no verificada.
- Los clones están protegidos contra reinicialización (`_initialized`).
- Revisado contra el checklist de seguridad obligatorio del proyecto (sin secretos, funciones que
  cambian estado con control de acceso, sin reentrancy en el único `call` externo de
  `claimDividends`, que sigue checks-effects-interactions).
