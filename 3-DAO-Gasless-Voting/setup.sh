#!/usr/bin/env bash
# One-time setup for the DAO Gasless Voting project.
# Installs Foundry contract deps and frontend packages, then runs the tests.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SC="$ROOT/sc"
WEB="$ROOT/web"

echo "▶ Checking prerequisites…"
command -v forge >/dev/null 2>&1 || {
  echo "✖ Foundry (forge) not found. Install it with:"
  echo "    curl -L https://foundry.paradigm.xyz | bash && foundryup"
  exit 1
}
command -v npm >/dev/null 2>&1 || { echo "✖ npm (Node 18+) not found."; exit 1; }
echo "✓ forge $(forge --version | head -1)"
echo "✓ node $(node --version)"

echo "▶ Installing contract libraries (sc/lib is gitignored)…"
cd "$SC"
[ -d lib/forge-std ] || forge install foundry-rs/forge-std --no-git
[ -d lib/openzeppelin-contracts ] || forge install OpenZeppelin/openzeppelin-contracts --no-git

echo "▶ Building & testing contracts…"
forge build
forge test -vv

echo "▶ Installing frontend dependencies…"
cd "$WEB"
[ -f .env.local ] || cp .env.example .env.local
npm install

echo ""
echo "✅ Setup complete. Next (4 terminals):"
echo "   1) make anvil     # local Ethereum node"
echo "   2) make deploy    # deploy MinimalForwarder + DAO"
echo "   3) make dev       # frontend (http://localhost:3000)"
echo "   4) make daemon    # auto-execute approved proposals"
