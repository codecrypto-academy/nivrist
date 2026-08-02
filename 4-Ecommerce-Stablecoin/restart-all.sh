#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# restart-all.sh — one command to boot the whole e-commerce stack:
#   1. stop previous processes           4. deploy Ecommerce (wired to EuroToken)
#   2. start Anvil (local chain)         5. inject addresses into every app's .env.local
#   3. deploy EuroToken (+1M mint)       6. start the 4 Next.js apps
# ---------------------------------------------------------------------------
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS="$ROOT/.logs"; mkdir -p "$LOGS"
RPC="http://127.0.0.1:8545"
# Anvil account #0 — deployer + token minter (public dev key, local only)
PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

SC_EURO="$ROOT/stablecoin/sc"
SC_ECOM="$ROOT/sc-ecommerce"
APP_COMPRA="$ROOT/stablecoin/compra-stableboin"
APP_PASARELA="$ROOT/stablecoin/pasarela-de-pago"
APP_ADMIN="$ROOT/web-admin"
APP_CUSTOMER="$ROOT/web-customer"

say() { printf "\033[36m▶ %s\033[0m\n" "$1"; }

# Upsert KEY=VALUE in an env file (replace line if present, else append).
set_env() {
  local key="$1" val="$2" file="$3"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    # portable in-place edit (BSD/GNU sed)
    sed -i.bak -E "s|^${key}=.*|${key}=${val}|" "$file" && rm -f "$file.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}

# Ensure an app has a .env.local (seed from .env.example, preserving existing secrets).
ensure_env() {
  local dir="$1"
  [ -f "$dir/.env.local" ] || cp "$dir/.env.example" "$dir/.env.local"
}

# --- 1. stop previous ---
say "Deteniendo procesos previos…"
pkill -f "anvil" 2>/dev/null || true
for p in 6001 6002 6003 6004; do pkill -f "next.*$p" 2>/dev/null || true; done
sleep 1

# --- 2. anvil ---
say "Iniciando Anvil…"
command -v anvil >/dev/null || { echo "✖ Foundry no instalado (curl -L https://foundry.paradigm.xyz | bash && foundryup)"; exit 1; }
anvil > "$LOGS/anvil.log" 2>&1 &
sleep 3

# --- contract libs (gitignored) ---
for sc in "$SC_EURO" "$SC_ECOM"; do
  [ -d "$sc/lib/forge-std" ] || forge install foundry-rs/forge-std --no-git --root "$sc" >/dev/null 2>&1 || true
  [ -d "$sc/lib/openzeppelin-contracts" ] || forge install OpenZeppelin/openzeppelin-contracts --no-git --root "$sc" >/dev/null 2>&1 || true
done

# --- 3. deploy EuroToken ---
say "Desplegando EuroToken…"
EURO_OUT=$(cd "$SC_EURO" && forge script script/DeployEuroToken.s.sol --rpc-url "$RPC" --broadcast --private-key "$PK" 2>&1) \
  || { printf '%s\n' "$EURO_OUT" | tail -6; echo "✖ Falló el deploy de EuroToken"; exit 1; }
EURO_ADDR=$(awk '/EuroToken:/{print $NF; exit}' <<< "$EURO_OUT")
[ -n "$EURO_ADDR" ] || { echo "✖ No se pudo leer la dirección de EuroToken"; exit 1; }
echo "   EuroToken = $EURO_ADDR"

# --- 4. deploy Ecommerce ---
say "Desplegando Ecommerce…"
ECOM_OUT=$(cd "$SC_ECOM" && EUROTOKEN_ADDRESS="$EURO_ADDR" forge script script/DeployEcommerce.s.sol --rpc-url "$RPC" --broadcast --private-key "$PK" 2>&1) \
  || { printf '%s\n' "$ECOM_OUT" | tail -6; echo "✖ Falló el deploy de Ecommerce"; exit 1; }
ECOM_ADDR=$(awk '/Ecommerce:/{print $NF; exit}' <<< "$ECOM_OUT")
[ -n "$ECOM_ADDR" ] || { echo "✖ No se pudo leer la dirección de Ecommerce"; exit 1; }
echo "   Ecommerce = $ECOM_ADDR"

# --- 5. inject addresses into every app ---
say "Inyectando direcciones en los .env.local…"
for app in "$APP_ADMIN" "$APP_CUSTOMER" "$APP_PASARELA"; do
  ensure_env "$app"
  set_env NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS "$EURO_ADDR" "$app/.env.local"
  set_env NEXT_PUBLIC_ECOMMERCE_CONTRACT_ADDRESS "$ECOM_ADDR" "$app/.env.local"
done
# compra-stableboin: keep Stripe keys, just refresh token addresses (public + server minter)
ensure_env "$APP_COMPRA"
set_env NEXT_PUBLIC_EUROTOKEN_CONTRACT_ADDRESS "$EURO_ADDR" "$APP_COMPRA/.env.local"
set_env EUROTOKEN_ADDRESS "$EURO_ADDR" "$APP_COMPRA/.env.local"

# --- npm installs (fresh clone) ---
for app in "$APP_ADMIN" "$APP_CUSTOMER" "$APP_PASARELA" "$APP_COMPRA"; do
  [ -d "$app/node_modules" ] || (say "npm install en $(basename "$app")…"; cd "$app" && npm install >/dev/null 2>&1)
done

# --- 6. start apps ---
say "Arrancando las 4 apps…"
start_app() { (cd "$1" && nohup npm run dev > "$LOGS/$2.log" 2>&1 &) ; }
start_app "$APP_COMPRA"   compra
start_app "$APP_PASARELA" pasarela
start_app "$APP_ADMIN"    admin
start_app "$APP_CUSTOMER" customer
sleep 6

cat <<EOF

✅ Sistema levantado

  Contratos
    EuroToken  $EURO_ADDR
    Ecommerce  $ECOM_ADDR

  Apps
    Compra EURT (Stripe)   http://localhost:6001
    Pasarela de pago       http://localhost:6002
    Admin (comercios)      http://localhost:6003
    Tienda (clientes)      http://localhost:6004

  Red local: $RPC · chainId 31337 · logs en .logs/
  Detener:   pkill -f anvil; for p in 6001 6002 6003 6004; do pkill -f "next.*\$p"; done

  Nota: para la compra con Stripe, pon tus claves test en
        stablecoin/compra-stableboin/.env.local (STRIPE_SECRET_KEY, etc.)
EOF
